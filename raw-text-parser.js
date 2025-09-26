
function isOccluded(el) {
	if(el.nodeType === Node.ELEMENT_NODE && el.ownerDocument === document){//Check if it's even an element node, since content inside nested documents has a different coordinate system they are ignored
		const rect = el.getBoundingClientRect();//get the rectangle the node occupies
		let elementArea = rect.width*rect.height//calculate its area...
		const centerX = rect.left + rect.width / 2;//...and center coordinate
		const centerY = rect.top + rect.height / 2;
		const topElement = document.elementFromPoint(centerX, centerY);//get the top element at the center coordinate
		if(topElement&& topElement.nodeName!="A"){//a tags (links) should not occlude other elements as they are sometimes overlayed to make elements clickable
			if(!el.contains(topElement) && !topElement.contains(el)){//if they are not a child of each other...
				//calculate intersection box:
				let topRect = topElement.getBoundingClientRect();//get the rectangle the top element occupies
				let left = Math.max(rect.left, topRect.left)
				let right = Math.min(rect.right, topRect.right)
				let top = Math.max(rect.top, topRect.top)
				let bottom = Math.min(rect.bottom, topRect.bottom)
				
				/*
				 * 
				 * 
				 * 
				 * We calculate the edges of the box of intersection (so we can then calculate width and height and ultimately the area):
				 * 
				 *         |--width-|
				 * 
				 *   +--------------+
				 *   |              |
				 *   |     +--top---+--------+   –
				 *   |     |########|        |   |
				 *   |     |########|        |   |
				 *   | left|########|right   |   | height
				 *   |     |########|        |   |
				 *   |     |########|        |   |
				 *   +-----+-bottom-+        |   –
				 *         |                 |
				 *         +-----------------+
				 * 
				 * height = bottom - top
				 * width = right-left
				 * 
				 */
				if(right<left || bottom<top) return false//check if the intersection box is invalid, return false if it is
				let intersectArea = (right-left)*(bottom-top)//get the area of the intersection
				return intersectArea/elementArea>0.5//treat element as occluded when over 50% of its are is occluded
			}
		}
		
	}
	return false;
}


function annotateNode(element) {//recursive main loop: Creates a copy of the DOM, incorporates shadow DOM, removes invisible/occluded elements, replaces all other tags with unwrap tags
	if(!element){//If something is None/undefined its replaced with an empty TextNode
		return document.createTextNode("")
	}else if(element.nodeType== Node.TEXT_NODE){//Text nodes are copied as is:
			return document.createTextNode(element.textContent)
	}else if(element.nodeType === Node.ELEMENT_NODE){//Remove elements that are invisible, occluded or simply invisible by default (e.g. scripts):
		if(["SCRIPT", "STYLE","META","LINK","NOSCRIPT"].includes(element.nodeName) || isOccluded(element) || !element.checkVisibility({opacityProperty: true, visibilityProperty : true})) {
			return document.createElement("br")
		}
	}
	
	let name =  "unwrap"//element should later be unwrapped (unwrap)
	
	let newNode = document.createElement(name);//create a node copy to add the content of the original to
	
	//Normal childNodes:
	for (let node of element.childNodes) {//add all children of the original node but also annotate them
		newNode.appendChild(annotateNode(node))
	}
	
	//childNodes inside an iFrame:
	if(element.nodeName=="IFRAME"){//if the original node is an iFrame add all its content too:
			try{
				let doc = element.contentDocument.body || element.contentWindow.document.body//find the iframes body as a root to start from
				let nodes = doc.querySelectorAll(":scope > *")//select all direct children of the root element
				for (let node of nodes){//annotate and add the nodes to the node copy
					newNode.appendChild(annotateNode(node))
				}
			}catch(e){
				console.log("Couldn't unwrap iFrame. Likely due to a cross-origin request issue: ",e)
			}
	}
	
	//childNodes inside shadowDOM:
	if (element.shadowRoot) {//if the lement is a shadow dom element add its children too
		for (let node of element.shadowRoot.childNodes) {//annotate and add children of shadow dom root
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
  res = res.replaceAll("<unwrap>","<br>").replaceAll("</unwrap>","<br>")//remove all unwrap tags (not their content)
  res = res.replaceAll(/<br>/g, '\n');//replace <br> tags with \n
  res = res.replaceAll('&nbsp;', ' ');//replace &nbsp; with blanks
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
getAllHTML()
