function isOccluded(el) {
if(el.nodeType === Node.ELEMENT_NODE && el.ownerDocument === document){
    const rect = el.getBoundingClientRect();
    let elArea = rect.width*rect.height
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(centerX, centerY);
    if(topEl){
        if(!el.contains(topEl) && !topEl.contains(el)){
            let topRect = topEl.getBoundingClientRect();
            let left = Math.max(rect.left, topRect.left)
            let right = Math.min(rect.right, topRect.right)
            let top = Math.max(rect.top, topRect.top)
            let bottom = Math.min(rect.bottom, topRect.bottom)
            if(right<left || bottom<top) return false
            let intersectArea = (right-left)*(bottom-top)
            return intersectArea/elArea>0.8
        }
    }
    
}
return false;
}




function deShadow(element) {
if(!element){
    return document.createTextNode("")
}
let newNode = element.cloneNode(false);
if(element.nodeName=="IFRAME"){
        let doc = element.contentDocument.body || element.contentWindow.document.body
        let nodes = doc.querySelectorAll(":scope > *")
        for (let node of nodes){
            let deshadowed = deShadow(node)
            console.log(node,deshadowed)
            newNode.appendChild(deshadowed)
        }
}
if(element.nodeType === Node.ELEMENT_NODE){
    if(["SCRIPT", "STYLE","META","LINK","NOSCRIPT"].includes(element.nodeName) || isOccluded(element) || !element.checkVisibility()) {
        return document.createElement("br")
    }
}
for (let node of element.childNodes) {
    newNode.appendChild(deShadow(node))
}

if (element.shadowRoot) {
    for (let node of element.shadowRoot.childNodes) {
        newNode.appendChild(deShadow(node))
    }
}
if(newNode.nodeType !== Node.TEXT_NODE){
    var removeable = document.createElement('REMOVEABLE');
    while (newNode.firstChild) {
        removeable.appendChild(newNode.firstChild);
    }
    if(removeable.innerText == ""){
        let replacer = element.title || element.ariaLabel || element.placeholder || element.alt || element.value;
        if(replacer){
            removeable.appendChild(document.createTextNode(replacer))
        }else{
            return document.createElement("br")
        }
    }
    return removeable
}
return newNode
}
function cleanUp(res){
  res = res.replaceAll("<removeable>","<br>").replaceAll("</removeable>","<br>")
  res = res.replaceAll(/<br>/g, '\n');
  res = res.replaceAll(/<clickable>\s+<\/clickable>/g, '');
  res = res.replaceAll(/<typeable>\s+<\/typeable>/g, '');
  res = res.replaceAll(/\n\s+/g, '\n');
  res = res.replaceAll(/ {2,}/g, ' ')
  return res
}
function getAllHTML() {
  try{
      return cleanUp(deShadow(document.body).outerHTML)
  }catch{
     return cleanUp(deShadow(document.body))
  }
}

getAllHTML()
