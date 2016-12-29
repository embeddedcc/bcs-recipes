/*
	# index.js

	Created by Brent Rahn <brent.rahn@gmail.com>

	Code for BCS Recipe Tool
*/

/*jshint -W065 */
/*global Q, BCS */
(function () {

var bcs = null;
var recipeFields,
    importData,
    view = {};

/*
	# recipeFields
*/
(function (module) {
  module.version = 1;
  module.fields = [];
  module.stored = {};
  module.url = null;
  
  module.load = function (bcsUrl) {
    
    module.url = bcsUrl;

    if(!localStorage['bcs-recipe.fields']) {
      console.log('no data in localStorage');
      return false;
    }
    
    var fields = JSON.parse(localStorage['bcs-recipe.fields']);
    console.log('Loading: ' + bcsUrl + ': ' + fields.toString());
    if(fields.version !== module.version) {
      console.error('Version mismatch.');
      return false;
    }
    
    module.stored = fields;
		
		if(!fields[bcsUrl]) {
			console.error('BCS Not Found in settings.');
			return false;
		}
		
    module.fields = fields[bcsUrl];
  };
  
  module.save = function () {
    module.stored[module.url] = module.fields;
    module.stored.version = module.version;
    console.log('Saving: ' + module.url + ': ' + module.stored.toString());
    
    localStorage['bcs-recipe.fields'] = JSON.stringify(module.stored);
  };
  
  module.eachName = function (callback) {
    module.fields.map(function (e) {return e.name;}) // Get the field names
      .filter(function (e, i, a) { return a.indexOf(e) === i;}) // Unique
      .forEach(function (name, index, array) { // Iterate through and call callback for each name
        // send array of fields with this name to the callback
        callback(module.fields.filter(function (e) {return e.name === name;}), index, array); 
      });
  };
  
  module.each = function (callback) {
    module.fields.forEach(callback);  /*(field, index, array)*/
  };
  
  module.clear = function () {
    module.fields = [];
  };
  
  module.push = function (element) {
    module.fields.push(element);
  };
}) (recipeFields = {});

/*
	# view.setup

	Handles the "Variable Setup" tab
*/
(function (module) {
  var fieldCount = 0;
  function createField() {
    var $fieldset = $('#setup .fields fieldset').last().clone(true);
    var $div = $fieldset.find('div.form-group');
    $div.attr('data-id', parseInt($div.attr('data-id')) + 1);
    $fieldset.find('[data-name]').val('');
    $fieldset.find('[data-name=targetState]').empty();
    $fieldset.find('[data-name=targetElement]').empty();
  
    $('#setup .fields fieldset').last().after($fieldset);
    return $fieldset;
  }
  
  function populateStateOptions($select, process) {
    $select.empty();
    $select.append(new Option(""));
    
    $.each(bcs.processes[process].states, function(i, state) {
      $select.append(new Option(state.name, i));
    });
  }

  function populateElementOptions($select, $process, state) {
    var process = bcs.processes[$process.val()];
    $select.empty();
    $select.append(new Option(""));
    
    $.each(process.states[state].timers, function (i, timer) {
      // Timers that are used, but not continuing from next state
      if(timer.used && !timer.preserve) {
        $select.append(new Option("Timer: " + process.timers[i].name, 'timer-' + i));
      }
    });
    
    $.each(process.states[state]['output_controllers'], function(i, oc) {
      if(oc.mode === 3 || oc.mode === 4 /* Hysteresis or PID */) {
        $select.append(new Option("Output: " + bcs.outputs[i].name, 'oc-' + i));  
      }
    });
    
    $.each(process.states[state]['exit_conditions'], function(i, ec) {
      var sourceName;
      if(ec.enabled) {
        if(ec['source_type'] === 2 /* Timer */) {
          sourceName = process.timers[ec['source_number']].name;
          $select.append(new Option("Exit Condition " + (i + 1) + ": " + sourceName, 'ec-' + i));
        } else if (ec['source_type'] === 1 /* Temp */) {
          sourceName = bcs.probes[ec['source_number']].name;
          $select.append(new Option("Exit Condition " + (i + 1) + ": " + sourceName, 'ec-' + i));
        } else {
          $select.append(new Option("Exit Condition " + (i + 1), 'ec-' + i));
        }
      }
      
    });
  }

  module.nextField = function () {
    var $fieldsets = $('#setup .fields fieldset');
    if(fieldCount++ === 0)
    {
      return $fieldsets.first();
    }
    
    return createField();
  };
  
  module.initialize = function () {
    var $select = $('#setup [data-name=targetProcess]');
  
    /*
      Set up Process drop down
    */
    $select.empty();
    $select.append(new Option(""));
    
    $.each(bcs.processes, function (i, process) {
      $select.append(new Option(process.name, i));
    });
    
    $('#setup [data-name=targetProcess]').on('change', function (event) {
      var $select = $(event.target).siblings('[data-name=targetState]');
      var process = event.target.value;
      
      populateStateOptions($select, process);
      
      $(event.target).siblings('[data-name=targetElement]').empty();
    });
    
    
    /*
      Setup State drop down
    */
    $('#setup [data-name=targetState]').on('change', function (event) {
      var $select = $(event.target).siblings('[data-name=targetElement]');
      var $process = $(event.target).siblings('[data-name=targetProcess]');
      
      populateElementOptions($select, $process, event.target.value);
    });
    
    
    /*
      Populate fields from localStorage, if available
    */
    recipeFields.each(function (field) {
      
      var $fieldset = view.setup.nextField();
  
      $fieldset.find('[data-name=variable]').val(field.name);
      $fieldset.find('[data-name=targetProcess]').val(field.process);
      
      populateStateOptions($fieldset.find('[data-name=targetState]'), field.process);
      $fieldset.find('[data-name=targetState]').val(field.state);
      
      populateElementOptions($fieldset.find('[data-name=targetElement]'), $fieldset.find('[data-name=targetProcess]'), field.state);
      $fieldset.find('[data-name=targetElement]').val(field.element);
    });
    
    /*
      Set up button onclick for Save button on settings page
    */
    $('#setup button').on('click', function (event) {
      event.preventDefault();
      
      recipeFields.clear();
      
      $('#setup .fields div.form-group').each(function (i, form) {
        var $form = $(form);
        var field = {
          name: $form.find('[data-name=variable]').val(),
          process: $form.find('[data-name=targetProcess]').val(),
          state: $form.find('[data-name=targetState]').val(),
          element: $form.find('[data-name=targetElement]').val()
        };
        recipeFields.push(field);
      });
  
      recipeFields.save();
      
      // Render the new recipe fields on the entry form
      view.entry.initialize();
    });
    
    /*
      Set up the handler for the new field link
    */
    $('#setup a.new').on('click', createField);
    
    /*
      Set up the handler for the remove field link
    */
    $('#setup a.remove').on('click', function (event) {
      event.preventDefault();
  
      var $fieldset = $(event.target).parents('fieldset');
      if($fieldset.find('div.form-group').attr('data-id') !== "0") {
        $fieldset.remove();
      } else {
        $fieldset.find('[data-name]').val('');
      }
    });
  };
}) (view.setup = {});


/*
	# view.entry

	Handles the "Recipe Values" tab
*/
(function (module) {
  function api(field) {
    var endpoint = null;
    switch(field.element.split('-')[0])
    {
      case 'oc':
        endpoint = '/output_controllers';
        break;
      case 'ec':
        endpoint = '/exit_conditions';
        break;
      case 'timer':
        endpoint = '';
    }
    
    return 'process/' + field.process + '/state/' + field.state + endpoint;
  }
  
  module.initialize = function () {
    // Remove any existing fields
    $('#values fieldset:not(.template):not(.bcs)').remove();
    
    recipeFields.eachName(function (fields) {
      fields.forEach(function (field, i) {
        var $fieldset = $('#values fieldset.template').clone();
        var $input = $fieldset.find('input');
        var type = field.element.split('-')[0];
        var index = field.element.split('-')[1];
        
        // If there are multiple fields with this name, we only display one
        // and update all the hidden ones when it changes.
        if(i === 0) { $fieldset.removeClass('hide'); }
        $fieldset.removeClass('template');
    
        $fieldset.find('label').html(field.name);
        $input.attr('data-api', api(field));
        $input.attr('data-key', index);
        $input.attr('data-fieldmatch', field.name);
        
        if(type === 'oc') {
          $input.attr('data-type', 'number');
        } else if(type === 'timer') {
          $input.attr('data-type', 'time');
        } else if (type === 'ec') {
          switch(bcs.processes[field.process].states[field.state]['exit_conditions'][index]['source_type']) {
            case 2:
              $input.attr('data-type', 'time');
              break;
            case 1:
              $input.attr('data-type', 'number');
              break;
          }
        }
        
        if(type === 'timer') {
          $input.attr('data-attr', 'init');
          $input.attr('data-object', 'timers');
        } else {
          $input.attr('data-attr', field.element.split('-')[0] === 'oc' ? 'setpoint' : 'value');
        }
        
        bcs.read(api(field)).then(function (body) {
          if($input.attr('data-object')) {
            body = body[$input.attr('data-object')];
          }
          
          var value = body[$input.attr('data-key')][$input.attr('data-attr')] / 10;
          
          if(type === 'timer' || $input.attr('data-type') !== 'number') {
            value = new BCS.Time(value * 10).toString();
          } 
          
          $input.val(value);
        });
        
        $input.on('change', function () {
          var data = {
            key: parseInt($input.attr('data-key')),
            value: {}
          };
    
          if($input.attr('data-type') === 'number') {
            data.value[$input.attr('data-attr')] = parseInt(parseFloat($input.val()) * 10);
          } else if($input.attr('data-type') === 'time') {
            data.value[$input.attr('data-attr')] = new BCS.Time.fromString($input.val()).value * 10;
          }
          
          if(type === 'timer') {
            data = { 'timers': data };
          }

          bcs.write($input.attr('data-api'), data).then(function (body) {
            var value = $input.attr('data-type') === 'number' ? body[$input.attr('data-key')][$input.attr('data-attr')] / 10 : 
                                       new BCS.Time(body[$input.attr('data-key')].value / 10).toString();
            $input.val(value);
          });
          
          // Update hidden fields
          if(!$input.parents('fieldset').hasClass('hide')) {
            $('fieldset.hide [data-fieldmatch="' + field.name + '"]').val($input.val()).trigger('change');
          }
          
        });
        
        $('#values .fields').append($fieldset);
        
      });
    });
  };
}) (view.entry = {});


function getTimers(process) {
  var timerPromises = [];
  for(var i = 0; i < 4; i++) {
    timerPromises.push(bcs.read('process/' + process + '/timer/' + i));
  }
  return Q.all(timerPromises);
}

function getStates(process) {
  var statePromises = [];
  async.times(8, function (i) {
    statePromises.push(bcs.read('process/' + process + '/state/' + i).then(function (state) {
      
      return Q.all([
        bcs.read('process/' + process + '/state/' + i + '/exit_conditions').then(function (ec) {
          return ec;
        }),
        bcs.read('process/' + process + '/state/' + i + '/output_controllers').then(function (oc) {
          return oc;
        })
      ])
      .then(function (results) {
        state['exit_conditions'] = results[0];
        state['output_controllers'] = results[1];
        return state;
      });
    }));
  });

  return Q.all(statePromises);
}

/*
	# document ready

	Initialize and setup the page
*/
$( document ).ready( function () {
  /*
    When a BCS url is entered, verify that it is running 4.0 and load 
    data from the BCS.
  */
  $('[data-name=bcs]').on('change', function (event) {
    if($(event.target.parentElement).find('.credentials [data-name=password]')[0]) {
      bcs = new BCS.Device(event.target.value, {
        auth: {
          username: 'admin',
          password: $(event.target.parentElement).find('.credentials [data-name=password]')[0].value
        }});
    } else {
      bcs = new BCS.Device(event.target.value);
    }

    bcs.on('notReady', function (e) {
      $(event.target).parent().addClass('has-error').removeClass('has-success');

      // Check if authentication is required
      if(e.cors && e.cors === 'rejected') {
        $('.credentials').removeClass('hide');
      }

    })
    .on('ready', function () {

      recipeFields.load(bcs.address);

      // Add list of BCS' found in recipeFields to the Export tab
      Object.keys(recipeFields.stored).forEach(function(device) {
        if(device === 'version') { return; }
        var $exportList = $('#exportSystems');
        $exportList.append(
          $('<label class="checkbox">' + device + '</label>')
          .append($('<input type="checkbox" data-name="' + device + '" checked>')));
      });

      localStorage['bcs-backup.url'] = bcs.address;
      $(event.target).parent().addClass('has-success').removeClass('has-error');

      $('.loading').removeClass('hide');
      $('.fields').addClass('hide');

      async.series([
        /*
          Get Process / State configuration
        */
        function (done) {
          if(!bcs.processes) { bcs.processes = []; }
          async.times(8, function (p, nextProcess) {
            bcs.read('process/' + p).then(function (process) {
              bcs.processes[p] = {
                name: process.name,
                states: []
              };

              return getStates(p);
            })
            .then(function (states) {
              bcs.processes[p].states = states;
              
              return getTimers(p);
            })
            .then(function (timers) {
              bcs.processes[p].timers = timers;
            })
            .catch(function () {
              $('.failed').removeClass('hide');
              $('.loading').addClass('hide');
              $('.fields').addClass('hide');
            })
            .finally(nextProcess);
          }, done);
        },
        /*
          Get Outputs and Temp Probes so we can show the names
        */
        function (done) {
          bcs.helpers.getOutputs().then(function (outputs) {
            bcs.outputs = outputs;
          })
          .finally(done);
        }, 
        function (done) {
          bcs.helpers.getProbes().then(function (probes) {
            bcs.probes = probes;
          })
          .finally(done);
        }
      ],
      function () {
        // done getting values from BCS
        view.setup.initialize();
        view.entry.initialize();
        
        $('.loading').addClass('hide');
        $('.fields').removeClass('hide');
      }); 
    });
  });

  $('[data-name=password]').on('change', function () {
    $('[data-name=bcs]').change();
  });

  /*
    Restore the URL on page load if we saved one in localStorage
  */
  if(localStorage['bcs-backup.url'])
  {
    $('[data-name=bcs]').val(localStorage['bcs-backup.url']);
    $('[data-name=bcs]').change();
  }
	
	/* setup menu items */
	var $menu = $('#settingsMenu');
	$menu.prepend($('<li></li>')
		.append($('<a href="#" data-toggle="modal" data-target="#export">Export Settings</a>')));
	$menu.prepend($('<li></li>')
		.append($('<a href="#" data-toggle="modal" data-target="#import">Import Settings</a>')));
    
  $('#export button[data-name=export]').on('click', function (event) {
    event.preventDefault();
    var settings = {
      version: recipeFields.version
    };
    
    $('#exportSystems input:checked').each(function (_, system) {
      settings[system.dataset['name']] = recipeFields.stored[system.dataset['name']] ;
    });
    // Create and save the file
    var blob = new Blob([JSON.stringify(settings)], {
      type: "text/plain;charset=utf-8"
    });
    saveAs(blob, ($('[data-name=fileName]').val() || "bcs-recipe-settings") + ".json");
    $('#export').modal('hide');
  });
  
  $('#import [data-name=fileName]').on('change', function (event) {
    var file = event.target.files[0],
      reader;

    reader = new FileReader();
    reader.addEventListener("load", function(event) {
      var importSystems = $('#importSystems');
      importSystems.empty();
      
      importData = JSON.parse(event.target.result);
      if (importData.version === recipeFields.version) {
        Object.keys(importData).forEach(function(device) {
          if(device === "version") return;
          
          importSystems.append(
            $('<label class="checkbox">' + device + '</label>')
            .append($('<input type="checkbox" data-name="' + device + '" checked>')));
        });        
      }

      $('#import button').removeClass('hide');
      
    });
    
    $('#import button[data-name=import]').on('click', function () {
      recipeFields.stored.version = importData.version;
      
      $('#import input[type="checkbox"]').each(function(_, input) {
        if(input.checked && importData[input.dataset['name']]) {
          recipeFields.stored[input.dataset['name']] = importData[input.dataset['name']];          
        }
      });
      localStorage['bcs-recipe.fields'] = JSON.stringify(recipeFields.stored);
      
    });

    reader.readAsText(file);    
  });
});

})(); 
