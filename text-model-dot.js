const ids = new Set();
const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
// return unique num-alphanum-alphanum id
function rn() {
  let id;
  const one = chars[Math.floor(Math.random() * 26)];
  const rest = () => chars[Math.floor(Math.random() * 36)];
  do id = one + rest() + rest(); while (ids.has(id));
  ids.add(id);
  return id;
}
function ws(s) {
  return s.replace(/ /g, "");
}
// model:graph stack text, zoom_links:create zoomable links
function model_to_dots(model, zoom_links) {
  const num_ids = { "Top": { "dpath": "Top", "path": "0" } };
  const levels = {};
  let last_level, last_command, last_object, last_predicate, last_subject;
  let level = [];
  let last_level_lines = [];
  let items = [];
  function set_line(level_id, level_lines, line) {
    levels[level_id] = levels[level_id] ||
      { "aspects": {}, "level": [], "lines": [], "dots": [] };
    levels[level_id].lines.push(line);
    if (level_lines.length > 0) levels[level_id].level = level_lines;
  }
  // this run-through is for metadata: narrative, note, href, subclass_of
  // split by whitespace-newline-whitespace
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    if (!line.includes("^//")) {
      if (line.includes("::")) {
        last_command = line.split(":: ")[1];
        if (last_command != "level") {
          set_line(last_level, [], `:: ${last_command}`);
        }
        level = [];
      } else {
        if (last_command == "level") {
          level.push(ws(line));
          // create key for level lines
          last_level_lines.push(line);
          last_level = level.join(".");
        } else {
          set_line(last_level, last_level_lines, line);
          last_level_lines = [];
        }
        if (
          ["narrative", "note", "href", "subclass_of"]
            .includes(last_command)
        ) {
          // create key for level-subject if it isn't there
          levels[last_level].aspects[ws(last_subject)] =
            levels[last_level].aspects[ws(last_subject)] || {};
          levels[last_level].aspects[ws(last_subject)][last_command] =
            levels[last_level].aspects[ws(last_subject)][last_command] || [];
          levels[last_level].aspects[ws(last_subject)][last_command].push(line);
        }
        if (
          ["processes", "datastores", "transforms", "agents", "locations"]
            .includes(last_command)
        ) {
          last_subject = line;
        }
        if (last_command == "level") last_subject = last_level;
      }
    }
  }
  // data_id is used to track number for processes and transforms at top of entity
  let data_id = 0;
  // split by whitespace-newline-whitespace
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    // labels on nodes split have different lines per word
    const l_lbl = line.replace(/ /g, "\\n");
    // levels are tracked without spaces, so if this line captured
    // use the scrunched version
    const l_nd = ws(line);
    if (line.includes("::")) {
      last_command = line.split(":: ")[1];
      if (last_command == "level") {
        level = [];
        data_id = 0;
      }
    } else {
      if (last_command != "level") {
        if (
          ["processes", "datastores", "transforms", "agents", "locations"]
            .includes(last_command)
        ) {
          const href = levels[level.join(".")].aspects?.[ws(line)]?.href || "";
          if (["datastores", "locations"].includes(last_command)) {
            data_id++;
            levels[level.join(".")].dots.push(
              `"${line}" [id="${rn()}" xhref="${href}" color="#cc3311" shape="record"
             class="${last_command}" label="<f0> R${data_id}|<f1> ${l_lbl} "]`,
            );
          }
          if (["transforms", "processes"].includes(last_command)) {
            // figure out the depth for the number
            const res = level.concat(l_nd).reduce(
              (p, c, i, a) => {
                if (!p[c]) {
                  p[c] = {
                    "dpath": `${a.slice(0, i + 1).join(".")}`,
                    "path": `${p["path"]}.${Object.keys(p).length - 1}`,
                  };
                }
                return p[c];
              },
              num_ids,
            );
            const subclass_of_array =
              levels[level.join(".")].aspects?.[ws(line)]?.subclass_of || [];
            const subclass_of = subclass_of_array.join("");
            const narr =
              levels[level.join(".")].aspects?.[ws(line)]?.narrative || "";
            const note = levels[level.join(".")].aspects?.[ws(line)]?.note ||
              "";
            const sub_href = subclass_of != "" ? `href="#${subclass_of}"` : "";
            const sub_cl = subclass_of != "" ? "has_subclass " : "";
            const zoom = levels?.[res.dpath] && zoom_links
              ? "zoomable"
              : "zoomnotable";
            const note_attached = (narr == "" && note == "")
              ? "notenotattached"
              : "noteattached";
            zoom == "zoomnotable"
              ? levels[level.join(".")].dots.push(
                `"${line}" [id="${rn()}" xhref="${href}" tooltip="${narr}\n${note}"
               color="#33bbee" ${sub_href} shape="rectangle" style="rounded" class="${sub_cl}${last_command} ${zoom} ${note_attached}" label="${res.path}\n${l_lbl}"]`,
              )
              : levels[level.join(".")].dots.push(
                `"${line}" [id="${rn()}" xhref="${href}" tooltip="${narr}\n${note}"
               color="#33bbee" href="#${res.dpath}" shape="rectangle" style="rounded" class="${last_command} ${zoom} ${note_attached}" label="${res.path}\n${l_lbl}"]`,
              );
          }
          if ("agents" == last_command) {
            levels[level.join(".")].dots.push(
              `"${line}" [id="${rn()}" xhref="${href}" color="#009988" shape="rectangle" class="${last_command}" label="${l_lbl}" ]`,
            );
          }
          last_subject = line;
        } else {
          if (["forward", "back", "both"].includes(last_command)) {
            items = [];
            last_object = line;
            last_predicate = last_command;
            levels[level.join(".")].dots.push(
              `"${last_subject}" -> "${line}" [ dir="${last_predicate}"]`,
            );
          } else {
            if (["items"].includes(last_command)) {
              items.push(line);
              levels[level.join(".")].dots.push(
                `"${last_subject}" -> "${last_object}" [tooltip="${
                  items.join("\n")
                }" dir="${last_predicate}"]`,
              );
            }
          }
        }
      } else {
        level.push(l_nd);
      }
    }
  }
  return levels;
}
export { model_to_dots };
