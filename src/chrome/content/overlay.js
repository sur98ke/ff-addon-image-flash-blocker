/*	Copyright (c) 2010 Shimon Chohen
	Developer: Dmitriy Khudorozhkov (dmitrykhudorozhkov@yahoo.com)

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
	WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
	ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
	WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
	ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
	OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

var imgflashblocker = {

	Cc: Components.classes,
	Ci: Components.interfaces,
	Cr: Components.results,

	styleSheetService: null,
	ioService: null,
	branch: null,

	checks: ["imgflashblocker-imgflash", "imgflashblocker-noimgflash", "imgflashblocker-imgnoflash", "imgflashblocker-noimgnoflash"],
	styles: [],

	passThrough: "",

	init: function()
	{
		this.styleSheetService = this.Cc["@mozilla.org/content/style-sheet-service;1"].getService(this.Ci.nsIStyleSheetService);
		this.ioService = this.Cc["@mozilla.org/network/io-service;1"].getService(this.Ci.nsIIOService);

		var prefservice  = this.Cc["@mozilla.org/preferences-service;1"].getService(this.Ci.nsIPrefService);
		this.branch = prefservice.getBranch("extensions.imgflashblocker.");

		//

		var style = "body img{visibility: hidden !important;}\n";
		style += "body img#imgflashblocker-special{visibility: visible !important;}\n";
		style += "body{background-image: none !important;}\n";
		style += "body *{background-image: none !important;}\n";
		style = "data:text/css;charset=utf8,\n" + encodeURIComponent(style);

		this.styles[1] = this.ioService.newURI(style, null, null);

		style = "body object{visibility: hidden;}\n";
		style += "body .imgflashblocker-special-class{cursor: pointer;}\n";
		style = "data:text/css;charset=utf8,\n" + encodeURIComponent(style);

		this.styles[2] = this.ioService.newURI(style, null, null);

		var style = "body img{visibility: hidden !important;}\n";
		style += "body img#imgflashblocker-special{visibility: visible !important;}\n";
		style += "body{background-image: none !important;}\n";
		style += "body *{background-image: none !important;}\n";
		style += "body object{visibility: hidden;}\n";
		style += "body .imgflashblocker-special-class{cursor: pointer;}\n";
		style = "data:text/css;charset=utf8,\n" + encodeURIComponent(style);

		this.styles[3] = this.ioService.newURI(style, null, null);

		//

		this.check(this.branch.getCharPref("current"));

		//

		var observerService = this.Cc["@mozilla.org/observer-service;1"].getService(this.Ci.nsIObserverService);
		observerService.addObserver(this, "http-on-modify-request", false);
		observerService.addObserver(this, "http-on-examine-response", false);

		window.addEventListener("DOMContentLoaded", this, false);
	},

	check: function(newid)
	{
		var current = this.branch.getCharPref("current");

		this.branch.setCharPref("current", newid);

		for(var i = 0, l = this.checks.length; i < l; i++)
		{
			var id = this.checks[i];
			var style = this.styles[i];

			if(i)
			{
				if(id == current)
				{
					if(this.styleSheetService.sheetRegistered(style, this.styleSheetService.AGENT_SHEET))
					{
						this.styleSheetService.unregisterSheet(style, this.styleSheetService.AGENT_SHEET);
					}
				}

				if(id == newid)
				{
					if(!this.styleSheetService.sheetRegistered(style, this.styleSheetService.AGENT_SHEET))
					{
						this.styleSheetService.loadAndRegisterSheet(style, this.styleSheetService.AGENT_SHEET);
					}
				}
			}

			document.getElementById(id).setAttribute("checked", (id == newid));
		}

		if(((newid == "imgflashblocker-imgflash") || (newid == "imgflashblocker-imgnoflash")) && ((current == "imgflashblocker-noimgflash") || (current == "imgflashblocker-noimgnoflash")))
		{
			for(i = 0, l = gBrowser.browsers.length; i < l; i++)
			{
				var doc = gBrowser.browsers[i].contentDocument;
				var imgs = doc.getElementsByTagName("img");

				for(var j = 0, m = imgs.length; j < m; j++)
				{
					var img = imgs[j];

					img.parentNode.replaceChild(img.cloneNode(true), img);
				}
			}
		}

		if(((current == "imgflashblocker-imgflash") || (current == "imgflashblocker-noimgflash")) && ((newid == "imgflashblocker-imgnoflash") || (newid == "imgflashblocker-noimgnoflash")))
		{
			for(i = 0, l = gBrowser.browsers.length; i < l; i++)
			{
				this.processFlash(gBrowser.browsers[i].contentDocument);
			}
		}
		else if(((newid == "imgflashblocker-imgflash") || (newid == "imgflashblocker-noimgflash")) && ((current == "imgflashblocker-imgnoflash") || (current == "imgflashblocker-noimgnoflash")))
		{
			for(i = 0, l = gBrowser.browsers.length; i < l; i++)
			{
				var doc = gBrowser.browsers[i].contentDocument;

				this.unprocessFlash(doc);
				this.unprocessBackgroundImages(doc);
			}
		}
	},

	open: function(node)
	{
		gBrowser.selectedTab = gBrowser.addTab(node.getAttribute("href"));
	},

	processFlash: function(doc)
	{
		var current = this.branch.getCharPref("current");

		if(doc && ((current == "imgflashblocker-imgnoflash") || (current == "imgflashblocker-noimgnoflash")))
		{
			var that = this;

			function createPlaceholder(flash)
			{
				var template = "<table style=\"width: 100%; height: 100%;\"><tr><td style=\"vertical-align: center; text-align: center;\"><img src=\"data:image/x-icon;base64,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\" width=\"48\" height=\"48\" alt=\"Flash movie\" id=\"imgflashblocker-special\"></td></tr></table>";

				var div = doc.createElement("div");
				div.className = "imgflashblocker-special-class";

				var computed = doc.defaultView.getComputedStyle(flash, null);

				var ds = div.style;
				ds.width = computed.getPropertyValue("width");
				ds.height = computed.getPropertyValue("height");

				div.innerHTML = template;

				div.relatedFlash = flash.parentNode.replaceChild(div, flash);

				div.addEventListener("click", function()
				{
					var object_ = this.relatedFlash;
					that.passThrough = that.getFlashSource(object_);

					object_.style.visibility = "visible";
					object_.imgflashblockerProcessed = true;

					this.parentNode.replaceChild(object_, this);
				},
				false);
			}

			var objects = doc.getElementsByTagName("object");

			for(var i = 0; i < objects.length; i++)
			{
				var object = objects[i];

				if(!object.imgflashblockerProcessed)
				{
					createPlaceholder(object);
					--i;
				}
			}

			var embeds = doc.getElementsByTagName("embed");

			for(i = 0; i < embeds.length; i++)
			{
				var embed = embeds[i];

				if(embed.parentNode.tagName.toLowerCase() == "object")
					continue;

				if(!embed.imgflashblockerProcessed)
				{
					createPlaceholder(embed);
					--i;
				}
			}
		}
	},

	unprocessFlash: function(doc)
	{
		var divs = doc.getElementsByClassName("imgflashblocker-special-class");

		for(var i = 0; i < divs.length; i++)
		{
			var div = divs[i];

			div.parentNode.replaceChild(div.relatedFlash, div);
			--i;
		}
	},

	getFlashSource: function(node)
	{
		var tag = node.tagName.toLowerCase();
		var src = "";

		if(tag == "object")
		{
			if(node.hasAttribute("data"))
			{
				src = node.getAttribute("data");
			}
			else
			{
				for(var i = 0, l = node.childNodes.length; i < l; i++)
				{
					var child = node.childNodes[i];

					if(child.tagName)
					{
						var childTag = child.tagName.toLowerCase();

						if((childTag == "param") && child.hasAttribute("name") && (child.getAttribute("name") == "movie"))
						{
							src = child.getAttribute("value");
							break;
						}
						else if(childTag == "embed")
						{
							src = child.getAttribute("src");
							break;
						}
					}
				}
			}
		}
		else if(tag == "embed")
		{
			src = node.getAttribute("src");
		}

		return src.toLowerCase();
	},

	unprocessBackgroundImages: function(doc)
	{
		var all = doc.getElementsByTagName("*");

		for(var i = 0, l = all.length; i < l; i++)
		{
			var object = all[i];
			var computed = doc.defaultView.getComputedStyle(object, null);

			var bkstyle = computed.getPropertyValue("background-image");

			var contains = bkstyle.indexOf("url(");
			if(contains != -1)
			{
				var src = bkstyle.substring(contains + 4, bkstyle.indexOf(")"));

				if(src.charAt(0) == "\"")
				{
					src = src.substr(1);
				}

				if(src.charAt(src.length - 1) == "\"")
				{
					src = src.substr(0, src.length - 1);
				}

				object.style.backgroundImage = "url(\"" + src + "\")";
			}
		}
	},

	handleEvent: function(event)
	{
		if(event.type == "DOMContentLoaded")
		{
			this.passThrough = "";

			var doc = event.originalTarget;
			this.processFlash(doc);

			var that = this;
			doc.documentElement.addEventListener("DOMNodeInserted", function() { that.processFlash(doc); }, false);
		}
	},

	observe: function(aSubject, aTopic, aData)
	{
		var current = this.branch.getCharPref("current");
		var nothing = (current == "imgflashblocker-noimgnoflash");
		var skipImg = ((current == "imgflashblocker-noimgflash") || nothing);
		var skipSwf = ((current == "imgflashblocker-imgnoflash") || nothing);

		if(skipImg || skipSwf)
		{
			var httpChannel = aSubject.QueryInterface(this.Ci.nsIHttpChannel);
			var url = httpChannel.URI.spec.toLowerCase();

			if(aTopic == "http-on-modify-request")
			{
				var path = httpChannel.URI.path.toLowerCase();

				var quest = path.indexOf("?");
				if(quest != -1)
				{
					path = path.substr(0, quest);
				}

				if(skipImg && (this.endsWith(path, ".jpg") || this.endsWith(path, ".png") || this.endsWith(path, ".gif")))
				{
					var request = httpChannel.QueryInterface(this.Ci.nsIRequest);
					request.cancel(this.Cr.NS_BINDING_ABORTED);
				}
				else
				{
					var blockSwf = (skipSwf && this.endsWith(path, ".swf"));

					if(blockSwf && (url.indexOf(this.passThrough) == -1))
					{
						var request = httpChannel.QueryInterface(this.Ci.nsIRequest);
						request.cancel(this.Cr.NS_BINDING_ABORTED);
					}
				}
			}
			else if(aTopic == "http-on-examine-response")
			{
				if(this.passThrough.length && (url.indexOf(this.passThrough) != -1))
				{
					this.passThrough = (httpChannel.responseStatus == 302) ? httpChannel.getResponseHeader("Location").toLowerCase() : "";
				}
			}
		}
	},

	QueryInterface: function(iid)
	{
		if(!iid.equals(this.Ci.nsISupports) && !iid.equals(this.Ci.nsIObserver))
		{
			throw this.Cr.NS_ERROR_NO_INTERFACE;
		}

		return this;
	},

	endsWith: function(string, suffix)
	{
		return (string.indexOf(suffix, string.length - suffix.length) !== -1);
	}
};

window.addEventListener("load", function() { imgflashblocker.init(); }, false);