/*! bcs-recipe-editor - v0.1.0 - 2015-08-02 */var saveAs=saveAs||"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob&&navigator.msSaveOrOpenBlob.bind(navigator)||function(a){"use strict";if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var b=a.document,c=function(){return a.URL||a.webkitURL||a},d=a.URL||a.webkitURL||a,e=b.createElementNS("http://www.w3.org/1999/xhtml","a"),f=!a.externalHost&&"download"in e,g=a.webkitRequestFileSystem,h=a.requestFileSystem||g||a.mozRequestFileSystem,i=function(b){(a.setImmediate||a.setTimeout)(function(){throw b},0)},j="application/octet-stream",k=0,l=[],m=function(){for(var a=l.length;a--;){var b=l[a];"string"==typeof b?d.revokeObjectURL(b):b.remove()}l.length=0},n=function(a,b,c){b=[].concat(b);for(var d=b.length;d--;){var e=a["on"+b[d]];if("function"==typeof e)try{e.call(a,c||a)}catch(f){i(f)}}},o=function(d,i){var m,o,p,q=this,r=d.type,s=!1,t=function(){var a=c().createObjectURL(d);return l.push(a),a},u=function(){n(q,"writestart progress write writeend".split(" "))},v=function(){(s||!m)&&(m=t(d)),o?o.location.href=m:window.open(m,"_blank"),q.readyState=q.DONE,u()},w=function(a){return function(){return q.readyState!==q.DONE?a.apply(this,arguments):void 0}},x={create:!0,exclusive:!1};if(q.readyState=q.INIT,i||(i="download"),f){m=t(d),b=a.document,e=b.createElementNS("http://www.w3.org/1999/xhtml","a"),e.href=m,e.download=i;var y=b.createEvent("MouseEvents");return y.initMouseEvent("click",!0,!1,a,0,0,0,0,0,!1,!1,!1,!1,0,null),e.dispatchEvent(y),q.readyState=q.DONE,void u()}return a.chrome&&r&&r!==j&&(p=d.slice||d.webkitSlice,d=p.call(d,0,d.size,j),s=!0),g&&"download"!==i&&(i+=".download"),(r===j||g)&&(o=a),h?(k+=d.size,void h(a.TEMPORARY,k,w(function(a){a.root.getDirectory("saved",x,w(function(a){var b=function(){a.getFile(i,x,w(function(a){a.createWriter(w(function(b){b.onwriteend=function(b){o.location.href=a.toURL(),l.push(a),q.readyState=q.DONE,n(q,"writeend",b)},b.onerror=function(){var a=b.error;a.code!==a.ABORT_ERR&&v()},"writestart progress write abort".split(" ").forEach(function(a){b["on"+a]=q["on"+a]}),b.write(d),q.abort=function(){b.abort(),q.readyState=q.DONE},q.readyState=q.WRITING}),v)}),v)};a.getFile(i,{create:!1},w(function(a){a.remove(),b()}),w(function(a){a.code===a.NOT_FOUND_ERR?b():v()}))}),v)}),v)):void v()},p=o.prototype,q=function(a,b){return new o(a,b)};return p.abort=function(){var a=this;a.readyState=a.DONE,n(a,"abort")},p.readyState=p.INIT=0,p.WRITING=1,p.DONE=2,p.error=p.onwritestart=p.onprogress=p.onwrite=p.onabort=p.onerror=p.onwriteend=null,a.addEventListener("unload",m,!1),q.unload=function(){m(),a.removeEventListener("unload",m,!1)},q}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);"undefined"!=typeof module&&(module.exports=saveAs);