const ids = new Set();
const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
function rn() {
  let id;
  const one = chars[Math.floor(Math.random() * 26)];
  const rest = () => chars[Math.floor(Math.random() * 36)];
  do id = one + rest() + rest(); while (ids.has(id));
  ids.add(id);
  return id;
}
function model_to_dots(model,zoom_links) {
  const num_ids = { "Top": { "dpath": "Top", "path": "0" } };
  const dots = {};
  const nns = {};
  let last_command, last_object, last_predicate, last_subject;
  let level = [];
  let items = [];
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    if (line.includes("::") && line.slice(0, 2) != "//") {
      level = [];
      last_command = line.split(":: ")[1];
    } else {
      if (last_command == "level") {
        level.push(line.replaceAll(" ", ""));
        dots[level.join(".")] = {};
      }
      if (
        ["narrative", "note"]
          .includes(last_command)
      ) {
        nns[
          `${Object.keys(dots).slice(-1)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ] = nns[
          `${Object.keys(dots).slice(-1)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ] || {};
        nns[
          `${Object.keys(dots).slice(-1)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ][last_command] = line;
      }
      if (last_command == "subclass_of") {
        nns[
          `${Object.keys(dots).slice(-3, -2)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ] = nns[
          `${Object.keys(dots).slice(-3, -2)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ] || {};
        nns[
          `${Object.keys(dots).slice(-3, -2)[0]}.${
            last_subject.replaceAll(" ", "")
          }`
        ][last_command] = line;
      }
      if (
        ["processes", "datastores", "transforms", "agents", "locations"]
          .includes(last_command)
      ) {
        last_subject = line;
      }
    }
  }
  let row = 0;
  let data_id = 0;
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    if (line.slice(0, 2) != "//") {
      const l_lbl = line.replace(/ /g, "\\n");
      const l_nd = line.replace(/ /g, "");
      if (line.includes("::")) {
        last_command = line.split(":: ")[1];
        if (last_command == "level") {
          level = [];
          data_id = 0;
        }
      } else {
        if (last_command != "level") {
          if (
            ["narrative", "note"]
              .includes(last_command)
          ) {
            nns[`${level.join(".")}.${last_subject.replaceAll(" ", "")}`] = nns[
              `${level.join(".")}.${last_subject.replaceAll(" ", "")}`
            ] || {};
            nns[`${level.join(".")}.${last_subject.replaceAll(" ", "")}`][
              last_command
            ] = line;
          }
          if (
            ["processes", "datastores", "transforms", "agents", "locations"]
              .includes(last_command)
          ) {
            if (["datastores", "locations"].includes(last_command)) {
              data_id++;
              dots[level.join(".")][line] =
                `"${line}" [id="${rn()}" color="#cc3311" shape="record" class="${last_command}" label="<f0> R${data_id}|<f1> ${l_lbl} "]`;
            }
            if (["transforms", "processes"].includes(last_command)) {
              const res = level.concat(l_nd).reduce(
                (p, c, i, a) => {
                  if (!p[c]) {
                    p[c] = {
                      "dpath": `${a.slice(0, i + 1).join(".")}`,
                      "path": `${p["path"]}.${Object.keys(p).length-1}`,
                    };
                  }
                  return p[c];
                },
                num_ids,
              );
              const subclass_of =
                nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                  ?.subclass_of || "";
              const narr = nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                ?.narrative || line;
              let note = nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                ?.note || "";
              const sub_href = subclass_of != ""
                ? `href="#${subclass_of}"`
                : "";
              const sub_cl = subclass_of != "" ? "has_subclass " : "";
              if (note != "") note = "note: " + note;
              const zoom = dots?.[res.dpath] && zoom_links ? "zoomable" : "zoomnotable";
              const note_attached = (narr == line && note == "")
                ? "notenotattached"
                : "noteattached";
              dots[level.join(".")][line] = zoom == "zoomnotable"
                ? `"${line}" [id="${rn()}" tooltip="${narr}\n${note}" color="#33bbee" ${sub_href} shape="rectangle" style="rounded" class="${sub_cl}${last_command} ${zoom} ${note_attached}" label="${res.path}\n${l_lbl}"]`
                : `"${line}" [id="${rn()}" tooltip="${narr}\n${note}" color="#33bbee" href="#${res.dpath}" shape="rectangle" style="rounded" class="${last_command} ${zoom} ${note_attached}" label="${res.path}\n${l_lbl}"]`;
            }
            if ("agents" == last_command) {
              dots[level.join(".")][line] =
                `"${line}" [id="${rn()}" color="#009988" shape="rectangle" class="${last_command}" label="${l_lbl}" ]`;
            }
            last_subject = line;
          } else {
            if (["forward", "back", "both"].includes(last_command)) {
              items = [];
              last_object = line;
              last_predicate = last_command;
              dots[level.join(".")][
                last_subject + "." + last_command + "." + last_object
              ] = `"${last_subject}" -> "${line}" [ dir="${last_predicate}"]`;
            } else {
              if (["items"].includes(last_command)) {
                items.push(line);
                dots[level.join(".")][
                  last_subject + "." + last_predicate + "." + last_object
                ] = `"${last_subject}" -> "${last_object}" [tooltip="${
                  items.join("\n")
                }" dir="${last_predicate}"]`;
              }
            }
          }
        } else {
          level.push(l_nd);
        }
      }
      row++;
    }
  }
  return { "dots": dots, "nns": nns };
}
export { model_to_dots };
