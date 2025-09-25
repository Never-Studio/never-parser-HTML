function isOccluded(el) {
	if(el.nodeType === Node.ELEMENT_NODE && el.ownerDocument === document){//Check if it's even an element node, since content inside nested documents has a different coordinate system they are ignored
		const rect = el.getBoundingClientRect();//get the rectangle the node occupies
		let elArea = rect.width*rect.height//calculate its area
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const topEl = document.elementFromPoint(centerX, centerY);//get elements with the same coordinate as the middle coordinate
		if(topEl && topEl.nodeName != "A"){//a tags (links) should not occlude other elements as they are sometimes overlayed to make elements clickable
			if(!el.contains(topEl) && !topEl.contains(el)){//if they are not a child of each other...
				//calculate intersection box:
				let topRect = topEl.getBoundingClientRect();
				let left = Math.max(rect.left, topRect.left)
				let right = Math.min(rect.right, topRect.right)
				let top = Math.max(rect.top, topRect.top)
				let bottom = Math.min(rect.bottom, topRect.bottom)
				if(right<left || bottom<top) return false//check if the intersection box is valid
				let intersectArea = (right-left)*(bottom-top)//get the area of the intersection
				return intersectArea/elArea>0.5//treat element as occluded when over 80% of its are is occluded
			}
		}
		
	}
	return false;
}

function isClickable(node) {//use a css query to match common objects that can be clicked (there may be unchecked edge cases)
	if(node.nodeType === Node.ELEMENT_NODE){
		return node.matches('a, button, select, option, area, input[type="submit"], input[type="button"], input[type="reset"], input[type="radio"], input[type="checkbox"], [role="button"], [role="link"], [role="checkbox"], [role="menuitemcheckbox"] , [role="menuitemradio"], [role="option"], [role="radio"], [role="switch"], [role="tab"], [role="treeitem"], [onclick]')
	}else{
		return false
	}
}

function isTypeable(node) {//use a css query to match common objects one can type in (there may be unchecked edge cases)
	if(node.nodeType === Node.ELEMENT_NODE){
		return node.matches('input[type="text"],input[type="password"],input[type="email"],input[type="search"],input[type="tel"],input[type="url"],input[type="number"],textarea,[role="textbox"], [role="search"], [role="searchbox"], [role="combobox"], [onkeydown],[onkeypress],[onkeyup]')
	}else{
		return false
	}
}

function annotateNode(element) {//recursive main loop: Creates a copy of the DOM, incorporates shadow DOM, removes invisible/occluded elements, annotates usability of elements and replaces all other tags with 
	if(!element){
		return document.createTextNode("")
	}else if(element.nodeType== Node.TEXT_NODE){//Text nodes are copied as is
			return document.createTextNode(element.textContent)
	}else if(element.nodeType === Node.ELEMENT_NODE){//remove elements that are invisible, occluded or simply invisible by defualt (e.g. scripts)
		if(["SCRIPT", "STYLE","META","LINK","NOSCRIPT"].includes(element.nodeName) || isOccluded(element) || !element.checkVisibility({opacityProperty: true, visibilityProperty : true})) {
			return document.createElement("br")
		}
	}
	
	let name =  isClickable(element) ? "clickable": isTypeable(element) ? "typeable" : "removeable"//decide whether the current node can be clicked, typed or if it should later be unwrapped (removeable)
	
	let newNode = document.createElement(name);//create a node copy to add the content of the original to
	
	for (let node of element.childNodes) {//add all children of the original node but also annotate them
		newNode.appendChild(annotateNode(node))
	}
	if(element.nodeName=="IFRAME"){//if the original node is an iFrame add all its content too:
			let doc = element.contentDocument.body || element.contentWindow.document.body//find the iframes body as a root to start from
			let nodes = doc.querySelectorAll(":scope > *")//select all direct children of the root element
			for (let node of nodes){//annotate and add the nodes to the node copy
				let deshadowed = annotateNode(node)
				newNode.appendChild(deshadowed)
			}
	}

	if (element.shadowRoot) {//if the lement is a shadow dom element add its children too
		for (let node of element.shadowRoot.childNodes) {//annoatte and add children of shadow dom root
			newNode.appendChild(annotateNode(node))
		}
	}
	
	//add text to empty elements based on their attributes
	if(newNode.innerText.trim().replaceAll(" ","") == ""){
		newNode.innerText = "";
		let replacer = element.title || element.ariaLabel || element.placeholder || element.alt;
		if(replacer){
			newNode.appendChild(document.createTextNode(replacer))
		}
	}
	
	return newNode
}
function cleanUp(res){//clean up an annotated html
  res = res.replaceAll("<removeable>","<br>").replaceAll("</removeable>","<br>")//remove all removeable tags (not their content)
  res = res.replaceAll(/<br>/g, '\n');//replace <br> tags with \n
  res = res.replaceAll('&nbsp;', ' ');//replace &nbsp; with blanks
  res = res.replaceAll(/<clickable>\s*<\/clickable>/g, '');//remove empty clickable tags
  res = res.replaceAll(/<typeable>\s*<\/typeable>/g, '');//remove empty typeable tags
  res = res.replaceAll(/\n\s+/g, '\n');//replace multiple \n with just one \n
  res = res.replaceAll(/ {2,}/g, ' ')//replace more than two blanks with just one blank
  return res
}
function getAllHTML() {//function to retrieve the current page as annotated text
  try{
      return cleanUp(annotateNode(document.body).outerHTML)
  }catch{
     return cleanUp(annotateNode(document.body))
  }
}
