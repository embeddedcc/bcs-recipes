/*jshint -W065 */
/*global bcslib */
(function () {
    
var bcs = {
    version: '',
    processes: [],
    outputs: [],
    probes: [],
    get outputCount() { return this.version === 'BCS-460' ? 6 : 8; }, /* Only temp controllable outputs */
    get probeCount() { return this.version === 'BCS-460' ? 4 : 8; }
    
};

var recipeFields, 
    view = {};

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
        if(fields.version !== module.version || !fields[bcsUrl]) {
            return false;
        }
        
        module.stored = fields;
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
        $('#setup button').on('click', function () {
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
        
        return '/api/process/' + field.process + '/state/' + field.state + endpoint;
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
                
                
                $.get(bcs.url + api(field), function (body) {
                    if($input.attr('data-object')) {
                        body = body[$input.attr('data-object')];
                    }
                    
                    var value = body[$input.attr('data-key')][$input.attr('data-attr')] / 10;
                    
                    if(type === 'timer' || $input.attr('data-type') !== 'number') {
                        value = new bcslib.Time(value).toString();
                    } 
                    
                    $input.val(value);
                });
                
                $input.on('change', function () {
                    var data = {
                        key: parseInt($input.attr('data-key')),
                        value: {}
                    };
        
                    if($input.attr('data-type') === 'number') {
                        data.value[$input.attr('data-attr')] = parseInt($input.val()) * 10;
                    } else if($input.attr('data-type') === 'time') {
                        data.value[$input.attr('data-attr')] = new bcslib.Time().fromString($input.val()).value * 10;
                    }
                    
                    if(type === 'timer') {
                        data = { 'timers': data };
                    }
                    
                    $.post(bcs.url + $input.attr('data-api'), JSON.stringify(data), function (body) {
                        var value = $input.attr('data-type') === 'number' ? body[$input.attr('data-key')][$input.attr('data-attr')] / 10 : 
                                                                           new bcslib.Time(body[$input.attr('data-key')].value / 10).toString();
                        $input.val(value);
                    });
                    
                    // Update hidden fields
                    if(!$input.parents('fieldset').hasClass('hide')) {
                        $('fieldset.hide [data-fieldmatch=' + field.name + ']').val($input.val()).trigger('change');
                    }
                    
                });
                
                $('#values .fields').append($fieldset);
                
            });
        });
    };
}) (view.entry = {});


function getTimers(process, callback) {
    bcs.processes[process].timers = [];
    async.times(4, function (i, next) {
        $.get(bcs.url + '/api/process/' + process + '/timer/' + i, function (data) {
            bcs.processes[process].timers[i] = {};
            bcs.processes[process].timers[i].name = data.name;
            next();
        })
        .fail(function () {next(true);});

    }, callback);
}

function getStates(process, callback) {
    async.times(8, function (i, nextState) {
        $.get(bcs.url + '/api/process/' + process + '/state/' + i, function (data) {
            bcs.processes[process].states[i] = {};
            bcs.processes[process].states[i].name = data.name;
            bcs.processes[process].states[i].timers = data.timers;
            
            async.parallel([
                function (next) {
                    $.get(bcs.url + '/api/process/' + process + '/state/' + i + '/exit_conditions', function (data) {
                        bcs.processes[process].states[i]['exit_conditions'] = data;
                        next();
                    })
                    .fail(function () {next(true);});
                },
                function (next) {
                    $.get(bcs.url + '/api/process/' + process + '/state/' + i + '/output_controllers', function (data) {
                        bcs.processes[process].states[i]['output_controllers'] = data;
                        next();
                    })
                    .fail(function () {next(true);});
                    
                }
            ], nextState);
        });
    }, callback);                            
}


$( document ).ready( function () {
    /*
        When a BCS url is entered, verify that it is running 4.0 and load 
        data from the BCS.
    */
    $('[data-name=bcs]').on('change', function (event) {
        $.get(event.target.value + '/api/device', function (data) {
            if(data.version === '4.0.0') {
                bcs.version = data.type;
                bcs.url = event.target.value;
                
                recipeFields.load(bcs.url);
                localStorage['bcs-backup.url'] = bcs.url;
                
                $(event.target).parent().addClass('has-success').removeClass('has-error');
            } else {
                $(event.target).parent().addClass('has-error').removeClass('has-success');            
            }
            
            $('.loading').removeClass('hide');
            $('.fields').addClass('hide');
            
            async.series([
                /*
                    Get Process / State configuration
                */
                function (done) {
                    async.times(8, function (i, nextProcess) {
                        $.get(bcs.url + '/api/process/' + i, function (data) {
                            bcs.processes[i] = {};
                            bcs.processes[i].name = data.name;
                            bcs.processes[i].states = [];
                            async.series([
                                function (next) {
                                    getTimers(i, next);
                                },
                                function (next) {
                                    getStates(i, next);
                                }
                            ], nextProcess);
                        })
                        .fail(function () {
                            $('.failed').removeClass('hide');
                            $('.loading').addClass('hide');
                            $('.fields').addClass('hide');
                            nextProcess(true);
                        });
                    }, done);
                },
                /*
                    Get Outputs and Temp Probes so we can show the names
                */
                function (done) {
                    async.times(bcs.outputCount, function (i, next) {
                        $.get(bcs.url + '/api/output/' + i, function (data) {
                            bcs.outputs[i] = data;
                            next();
                        });
                    }, 
                    function () {
                        async.times(bcs.probeCount, function (i, next) {
                            $.get(bcs.url + '/api/temp/' + i, function (data) {
                                bcs.probes[i] = data;
                                next();
                            });
                        }, done);
                    });
                }
            ],
            function () {
                // done getting values from BCS
                if($(event.target).parents('#setup').length) {
                    view.setup.initialize();
                } else {
                    view.entry.initialize();
                }
                
                $('.loading').addClass('hide');
                $('.fields').removeClass('hide');
            }); 

        })
        .fail(function () {
            $(event.target).parent().addClass('has-error').removeClass('has-success');
        });
    });
    
    /*
        Restore the URL on page load if we saved one in localStorage
    */
    if(localStorage['bcs-backup.url'])
    {
        $('[data-name=bcs]').val(localStorage['bcs-backup.url']);
        $('[data-name=bcs]').change();
    }
});

})(); 
