/*! bcs-recipe-editor - v0.1.0 - 2014-05-07 */var bcslib={};bcslib.Time=function(){var a=function(a){return this.value=a||0,this},b=function(a){return 10>a?"0"+a:""+a};return a.prototype.toString=function(){var a=Math.floor(this.value/3600),c=Math.floor(this.value%3600/60),d=Math.floor(this.value%60);return a+":"+b(c)+":"+b(d)},a.prototype.fromString=function(a){var b=a.split(":").reverse();this.value=0;for(var c=0;c<b.length;c++){if(c>2)return this;this.value+=parseInt(b[c])*Math.pow(60,c)}return this},a}(),function(){function a(a,b){d.processes[a].timers=[],async.times(4,function(b,c){$.get(d.url+"/api/process/"+a+"/timer/"+b,function(e){d.processes[a].timers[b]={},d.processes[a].timers[b].name=e.name,c()}).fail(function(){c(!0)})},b)}function b(a,b){async.times(8,function(b,c){$.get(d.url+"/api/process/"+a+"/state/"+b,function(e){d.processes[a].states[b]={},d.processes[a].states[b].name=e.name,d.processes[a].states[b].timers=e.timers,async.parallel([function(c){$.get(d.url+"/api/process/"+a+"/state/"+b+"/exit_conditions",function(e){d.processes[a].states[b].exit_conditions=e,c()}).fail(function(){c(!0)})},function(c){$.get(d.url+"/api/process/"+a+"/state/"+b+"/output_controllers",function(e){d.processes[a].states[b].output_controllers=e,c()}).fail(function(){c(!0)})}],c)})},b)}var c,d={version:"",processes:[],outputs:[],probes:[],get outputCount(){return"BCS-460"===this.version?6:8},get probeCount(){return"BCS-460"===this.version?4:8}},e={};!function(a){a.version=1,a.fields=[],a.stored={},a.url=null,a.load=function(b){if(a.url=b,!localStorage["bcs-recipe.fields"])return console.log("no data in localStorage"),!1;var c=JSON.parse(localStorage["bcs-recipe.fields"]);return console.log("Loading: "+b+": "+c.toString()),c.version===a.version&&c[b]?(a.stored=c,void(a.fields=c[b])):!1},a.save=function(){a.stored[a.url]=a.fields,a.stored.version=a.version,console.log("Saving: "+a.url+": "+a.stored.toString()),localStorage["bcs-recipe.fields"]=JSON.stringify(a.stored)},a.each=function(b){a.fields.forEach(b)},a.clear=function(){a.fields=[]},a.push=function(b){a.fields.push(b)}}(c={}),function(a){function b(){var a=$("#setup .fields fieldset").last().clone(!0),b=a.find("div.form-group");return b.attr("data-id",parseInt(b.attr("data-id"))+1),a.find("[data-name]").val(""),a.find("[data-name=targetState]").empty(),a.find("[data-name=targetElement]").empty(),$("#setup .fields fieldset").last().after(a),a}function f(a,b){a.empty(),a.append(new Option("")),$.each(d.processes[b].states,function(b,c){a.append(new Option(c.name,b))})}function g(a,b,c){var e=d.processes[b.val()];a.empty(),a.append(new Option("")),$.each(e.states[c].timers,function(b,c){c.used&&!c.preserve&&a.append(new Option("Timer: "+e.timers[b].name,"timer-"+b))}),$.each(e.states[c].output_controllers,function(b,c){(3===c.mode||4===c.mode)&&a.append(new Option("Output: "+d.outputs[b].name,"oc-"+b))}),$.each(e.states[c].exit_conditions,function(b,c){var f;c.enabled&&(2===c.source_type?(f=e.timers[c.source_number].name,a.append(new Option("Exit Condition "+(b+1)+": "+f,"ec-"+b))):1===c.source_type?(f=d.probes[c.source_number].name,a.append(new Option("Exit Condition "+(b+1)+": "+f,"ec-"+b))):a.append(new Option("Exit Condition "+(b+1),"ec-"+b)))})}var h=0;a.nextField=function(){var a=$("#setup .fields fieldset");return 0===h++?a.first():b()},a.initialize=function(){var a=$("#setup [data-name=targetProcess]");a.empty(),a.append(new Option("")),$.each(d.processes,function(b,c){a.append(new Option(c.name,b))}),$("#setup [data-name=targetProcess]").on("change",function(a){var b=$(a.target).siblings("[data-name=targetState]"),c=a.target.value;f(b,c),$(a.target).siblings("[data-name=targetElement]").empty()}),$("#setup [data-name=targetState]").on("change",function(a){var b=$(a.target).siblings("[data-name=targetElement]"),c=$(a.target).siblings("[data-name=targetProcess]");g(b,c,a.target.value)}),c.each(function(a){var b=e.setup.nextField();b.find("[data-name=variable]").val(a.name),b.find("[data-name=targetProcess]").val(a.process),f(b.find("[data-name=targetState]"),a.process),b.find("[data-name=targetState]").val(a.state),g(b.find("[data-name=targetElement]"),b.find("[data-name=targetProcess]"),a.state),b.find("[data-name=targetElement]").val(a.element)}),$("#setup button").on("click",function(){event.preventDefault(),c.clear(),$("#setup .fields div.form-group").each(function(a,b){var d=$(b),e={name:d.find("[data-name=variable]").val(),process:d.find("[data-name=targetProcess]").val(),state:d.find("[data-name=targetState]").val(),element:d.find("[data-name=targetElement]").val()};c.push(e)}),c.save(),e.entry.initialize()}),$("#setup a.new").on("click",b),$("#setup a.remove").on("click",function(a){a.preventDefault();var b=$(a.target).parents("fieldset");"0"!==b.find("div.form-group").attr("data-id")?b.remove():b.find("[data-name]").val("")})}}(e.setup={}),function(a){function b(a){var b=null;switch(a.element.split("-")[0]){case"oc":b="/output_controllers";break;case"ec":b="/exit_conditions";break;case"timer":b=""}return"/api/process/"+a.process+"/state/"+a.state+b}a.initialize=function(){c.each(function(a){var c=$("#values fieldset.template").clone(),e=c.find("input"),f=a.element.split("-")[0],g=a.element.split("-")[1];if(c.removeClass("hide"),c.removeClass("template"),c.find("label").html(a.name),e.attr("data-api",b(a)),e.attr("data-key",g),"oc"===f)e.attr("data-type","number");else if("timer"===f)e.attr("data-type","time");else if("ec"===f)switch(d.processes[a.process].states[a.state].exit_conditions[g].source_type){case 2:e.attr("data-type","time");break;case 1:e.attr("data-type","number")}"timer"===f?(e.attr("data-attr","init"),e.attr("data-object","timers")):e.attr("data-attr","oc"===a.element.split("-")[0]?"setpoint":"value"),$.get(d.url+b(a),function(a){e.attr("data-object")&&(a=a[e.attr("data-object")]);var b=a[e.attr("data-key")][e.attr("data-attr")]/10;("timer"===f||"number"!==e.attr("data-type"))&&(b=new bcslib.Time(b).toString()),e.val(b)}),e.on("change",function(){var a={key:parseInt(e.attr("data-key")),value:{}};"number"===e.attr("data-type")?a.value[e.attr("data-attr")]=10*parseInt(e.val()):"time"===e.attr("data-type")&&(a.value[e.attr("data-attr")]=10*(new bcslib.Time).fromString(e.val()).value),"timer"===f&&(a={timers:a}),$.post(d.url+e.attr("data-api"),JSON.stringify(a),function(a){var b="number"===e.attr("data-type")?a[e.attr("data-key")][e.attr("data-attr")]/10:new bcslib.Time(a[e.attr("data-key")].value/10).toString();e.val(b)})}),$("#values .fields").append(c)})}}(e.entry={}),$(document).ready(function(){$("[data-name=bcs]").on("change",function(f){$.get(f.target.value+"/api/device",function(g){"4.0.0"===g.version?(d.version=g.type,d.url=f.target.value,c.load(d.url),localStorage["bcs-backup.url"]=d.url,$(f.target).parent().addClass("has-success").removeClass("has-error")):$(f.target).parent().addClass("has-error").removeClass("has-success"),$(".loading").removeClass("hide"),$(".fields").addClass("hide"),async.series([function(c){async.times(8,function(c,e){$.get(d.url+"/api/process/"+c,function(f){d.processes[c]={},d.processes[c].name=f.name,d.processes[c].states=[],async.series([function(b){a(c,b)},function(a){b(c,a)}],e)}).fail(function(){$(".failed").removeClass("hide"),$(".loading").addClass("hide"),$(".fields").addClass("hide"),e(!0)})},c)},function(a){async.times(d.outputCount,function(a,b){$.get(d.url+"/api/output/"+a,function(c){d.outputs[a]=c,b()})},function(){async.times(d.probeCount,function(a,b){$.get(d.url+"/api/temp/"+a,function(c){d.probes[a]=c,b()})},a)})}],function(){$(f.target).parents("#setup").length?e.setup.initialize():e.entry.initialize(),$(".loading").addClass("hide"),$(".fields").removeClass("hide")})}).fail(function(){$(f.target).parent().addClass("has-error").removeClass("has-success")})}),localStorage["bcs-backup.url"]&&($("[data-name=bcs]").val(localStorage["bcs-backup.url"]),$("[data-name=bcs]").change())})}();