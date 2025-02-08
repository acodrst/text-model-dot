function model_to_dots_ii(model) {
  const num_ids = { "Top": { "dpath": "Top", "path": "0" } };
  const dots = {};
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
        site
          .nns[
            `${Object.keys(dots).slice(-1)[0]}.${
              last_subject.replaceAll(" ", "")
            }`
          ] = site
            .nns[
              `${Object.keys(dots).slice(-1)[0]}.${
                last_subject.replaceAll(" ", "")
              }`
            ] || {};
        site
          .nns[
            `${Object.keys(dots).slice(-1)[0]}.${
              last_subject.replaceAll(" ", "")
            }`
          ][last_command] = line;
      }
      if (last_command == "subclass_of") {
        site
          .nns[
            `${Object.keys(dots).slice(-3, -2)[0]}.${
              last_subject.replaceAll(" ", "")
            }`
          ] = site
            .nns[
              `${Object.keys(dots).slice(-3, -2)[0]}.${
                last_subject.replaceAll(" ", "")
              }`
            ] || {};
        site
          .nns[
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
  let data_id = 1;
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    if (line.slice(0, 2) != "//") {
      const l_lbl = line.replace(/ /g, "\\n");
      const l_nd = line.replace(/ /g, "");
      if (line.includes("::")) {
        last_command = line.split(":: ")[1];
        if (last_command == "level") {
          level = [];
          data_id = 1;
        }
      } else {
        if (last_command != "level") {
          if (
            ["narrative", "note"]
              .includes(last_command)
          ) {
            site.nns[`${level.join(".")}.${last_subject.replaceAll(" ", "")}`] =
              site
                .nns[
                  `${level.join(".")}.${last_subject.replaceAll(" ", "")}`
                ] || {};
            site
              .nns[`${level.join(".")}.${last_subject.replaceAll(" ", "")}`][
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
                      "path": `${p["path"]}.${Object.keys(p).length}`,
                    };
                  }
                  return p[c];
                },
                num_ids,
              );
              const subclass_of =
                site.nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                  ?.subclass_of || "";
              const narr =
                site.nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                  ?.narrative || line;
              let note =
                site.nns[`${level.join(".")}.${line.replaceAll(" ", "")}`]
                  ?.note || "";
              const sub_href = subclass_of != ""
                ? `href="#${subclass_of}"`
                : "";
              const sub_cl = subclass_of != "" ? "has_subclass " : "";
              if (note != "") note = "note: " + note;
              const zoom = dots?.[res.dpath] ? "zoomable" : "zoomnotable";
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
  return { "dots": dots };
}
function report_svg(path,tree,reports) {
  let role=path.split('.').slice(-1)=='Govern'?'All':path.split('.').slice(-1)
  let rep = []
  for (let t in tree) {
    if (tree?.[t]?.role?.[role] || role=='All') {
      rep.push(`${Object.keys(tree[t].last_name)[0]}, ${Object.keys(tree[t].first_name)[0]}${t}`)
    }
  }
  rep.sort()
  let bar= 1 
  let pg =`<text font-family="Arial" font-weight="bold" font-color="black" font-size="18px" x="10px" y="16px">${role}</text>
  <text font-family="Arial" font-weight="bold"  font-color="black" font-size="14px" x="10px" 
  y="40px">Name<tspan x="170px" y="40px">Street Address</tspan>
  <tspan x="400px" y="40px">Mobile:</tspan><tspan text-anchor="end" x="700px" y="40px">Email Address:</tspan></text>
  <line x1="5px" y1="43px" x2="705px" y2="43px" stroke-width="2px" stroke="grey" /> `
  let i = 57 
  for (let j of rep) {
    const id = (j.slice(-8))
    pg+='<g>'
    if (0<bar && bar<4) {
      pg+=`<rect x="5px" y="${i-11}px" width="700px" height="15px" fill="#d1eee1"></rect>`
    }
    pg += `<text font-family="Arial" font-color="black" font-size="12px" x="10px" y="${i}px">${j.slice(0, -8)}<tspan x="170px" y="${i}">${Object.keys(tree[id].street_address)[0]}</tspan>
      <tspan x="400px" y="${i}">${Object.keys(tree[id].mobile_number)[0]}</tspan>
      <tspan text-anchor="end" x="700px" y="${i}">${Object.keys(tree[id].first_name)[0]}.${Object.keys(tree[id].last_name)[0]}@example.org</tspan></text>
      `
    bar++
    if (bar==6) bar=0
    pg+='</g>'
    i += 14
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="705px" height="${i + 10}px">\n<rect width="100%" height="100%" fill="white"></rect>\n ${pg}</svg>`
}
function n_s(nd) {
  return   nd == "transforms" ? { marg: ".01", fill: "#ffd6bc", col: "#EE7733", shape: "octagon", style: "filled", }
    //: nd == "agents" ? { marg: ".01", fill: "#fcf1f5", col: "#EE3377", shape: "oval", style: "filled" }
    : nd == "agents" ? { marg: ".05", fill: "#fff0ec", col: "#CC3311", shape: "rectangle", style: "filled" }
    : nd == "entities" ? { marg: ".05", fill: "#fff0ec", col: "#CC3311", shape: "Mrecord", style: "filled" }
    : nd == "processes" ? { marg: ".01", fill: "#fff0ec", col: "#CC3311", shape: "doubleoctagon", style: "filled" }
    : nd == "datastores" ? { marg: ".05", fill: "#fff0ec", col: "#CC3311", shape: "cylinder", style: "filled" }
    : { marg: ".05", fill: "#e4fcff", col: "#33BBEE", shape: "oval", style: "filled", }
}
function model_to_dots(model,reports) {
  let dots={}
  let last_command
  let last_object
  let last_predicate
  let last_subject
  let edge_color
  let structured=[]
  let level=[]
  let items=[]
  for (const line of model.trim().split(/\s*\n+\s*/)) {
      if (line.includes("::") && line.slice(0, 2) != "//") {
        level=[]
        last_command =  line.split(":: ")[1]
      }
      else if (last_command=='level'){
        level.push(line.replace(/ /, ""))
        dots[level.join(".")] = {}
      }
  }
  var row=0
  for (const line of model.trim().split(/\s*\n+\s*/)) {
    if (line.slice(0, 2) != "//") {
      const l_lbl=line.replace(/ /g,'\\n')
      const l_nd=line.replace(/ /g,'')
      const l_lvl=level.join('.')+'.'+l_nd
      if (line.includes("::")) {
        last_command = line.split(":: ")[1]
        if (last_command=='level'){
          level=[]
        }
        ["entities","processes","datastores","transforms", "agents", "locations"].includes(last_command) ?  structured.push({x:1,y:row,w:3,h:1,content:line})
        : ["forward", "back", "both"].includes(last_command) ? structured.push({x:2,y:row,w:3,h:1,content:line})
        : ["items"].includes(last_command) ? structured.push({x:2,y:row,w:3,h:1,content:line})
        : structured.push({x:0,y:row,w:3,h:1,content:line})
      }
      else {
        if (last_command!='level') {
          let pre=last_command=="entities"? '<f0>|<f1>' : ''
          if (["entities","processes","datastores","transforms", "agents", "locations"].includes(last_command)) {
            edge_color=["entities","processes","datastores"].includes(last_command) ? '#cc3311' : '#009988' 
            const ns = n_s(last_command)
            const lbl= l_lvl in reports && !(l_lvl in dots) ? ` href="#${l_lvl}" tooltip="#${l_lvl}" label="#\n ${l_lbl} "`
            :  l_lvl in dots && last_command=="agents" ?  ` href="#${l_lvl}" tooltip="#${l_lvl}" label=" ${l_lbl} "`
           : l_lvl in dots ? ` href="#${l_lvl}" tooltip="#${l_lvl}" label="${l_lbl}"`
            : `label="${l_lbl}"`
            dots[level.join(".")][line] =
            `"${line}" [id="${l_nd}" ${lbl}  margin="${ns.marg}" fillcolor="${ns.fill}" color="${ns.col}" shape="${ns.shape}" style="${ns.style}"]`
            last_subject=line
            structured.push({x:2,y:row,w:2,h:1,content:line})
          }
          else{
            if (["forward", "back", "both"].includes(last_command)) {
              items=[]
              last_object = line
              last_predicate=last_command
              dots[level.join(".")][last_subject + "." + last_command + "." + last_object] = `"${last_subject}" -> "${line}" [color="${edge_color}" dir="${last_predicate}"]`
              structured.push({x:2,y:row,w:2,h:1,content:line})
            }
            else{
              if (["items"].includes(last_command)) {
                items.push(line)
                dots[level.join(".")][last_subject+"."+last_predicate+"."+last_object] =
                `"${last_subject}" -> "${last_object}" [tooltip="${items.join('\n')}" dir="${last_predicate}"]`
                structured.push({x:2,y:row,w:2,h:1,content:line})
              }
            }
          }
        }
        else {
           level.push(l_nd)
           structured.push({x:1,y:row,w:2,h:1,content:line})
        }
      }
      row++
    }
  }
  return {'dots':dots,'structured':structured}
}
export { model_to_dots, n_s, report_svg,model_to_dots_ii} 
