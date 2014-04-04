/*jshint -W065 */
/*global bcslib */

var bcs = {
    version: '',
    processes: [],
    outputs: [],
    get outputCount() { return this.version === 'BCS-460' ? 6 : 8; } /* Only temp controllable outputs */
};


function newSetupField() {
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
    
    $.each(process.states[state]['output_controllers'], function(i, oc) {
        if(oc.mode === 3 || oc.mode === 4 /* Hysteresis or PID */) {
            $select.append(new Option(bcs.outputs[i].name, 'oc-' + i));    
        }
    });
    
    $.each(process.states[state]['exit_conditions'], function(i, ec) {
        var sourceName;
        if(ec.enabled) {
            if(ec['source_type'] === 2 /* Timer */) {
                sourceName = process.timers[ec['source_number']].name;
                $select.append(new Option("Exit Condition " + (i + 1) + ": " + sourceName, 'ec-' + i));
            } else {
                $select.append(new Option("Exit Condition " + (i + 1), 'ec-' + i));
            }
        }
        
    });
}

function getTimers(process, callback) {
    bcs.processes[process].timers = [];
    async.times(4, function (i, next) {
        $.get(bcs.url + '/api/process/' + process + '/timer/' + i, function (data) {
            bcs.processes[process].timers[i] = {};
            bcs.processes[process].timers[i].name = data.name;
            next();
        });
    }, callback);
}

function getStates(process, callback) {
    async.times(8, function (i, nextState) {
        $.get(bcs.url + '/api/process/' + process + '/state/' + i, function (data) {
            bcs.processes[process].states[i] = {};
            bcs.processes[process].states[i].name = data.name;
            async.parallel([
                function (next) {
                    $.get(bcs.url + '/api/process/' + process + '/state/' + i + '/exit_conditions', function (data) {
                        bcs.processes[process].states[i]['exit_conditions'] = data;
                        next();
                    });
                },
                function (next) {
                    $.get(bcs.url + '/api/process/' + process + '/state/' + i + '/output_controllers', function (data) {
                        bcs.processes[process].states[i]['output_controllers'] = data;
                        next();
                    });
                }
            ], nextState);
        });
    }, callback);                            
}

function initializeSetupPage() {
    var $select = $('#setup [data-name=targetProcess]'),
        fields;

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
    if(localStorage['bcs-recipe.fields']) {
    
        fields = JSON.parse(localStorage['bcs-recipe.fields']);
        $.each(fields, function (i, field) {
            var $fieldset;
            if(i > 0) {
                $fieldset = newSetupField();
            } else {
                $fieldset = $('#setup .fields fieldset').first();
            }
            
            $fieldset.find('[data-name=variable]').val(field.name);
            $fieldset.find('[data-name=targetProcess]').val(field.process);
            
            populateStateOptions($fieldset.find('[data-name=targetState]'), field.process);
            $fieldset.find('[data-name=targetState]').val(field.state);
            
            populateElementOptions($fieldset.find('[data-name=targetElement]'), $fieldset.find('[data-name=targetProcess]'), field.state);
            $fieldset.find('[data-name=targetElement]').val(field.element);
        });
    }
}

function api(field) {
    var endpoint = field.element.split('-')[0] === 'oc' ? '/output_controllers' : '/exit_conditions';
    return '/api/process/' + field.process + '/state/' + field.state + endpoint;
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
                    Get Outputs so we can show the names
                */
                function (done) {
                    async.times(bcs.outputCount, function (i, next) {
                        $.get(bcs.url + '/api/output/' + i, function (data) {
                            bcs.outputs[i] = data;
                            next();
                        });
                    }, done);
                }
            ],
            function () {
                // done getting values from BCS
                    
                if($(event.target).parents('#setup').length)
                {
                    initializeSetupPage();
                } else {
                    if(localStorage['bcs-recipe.fields']) {
                    
                        var fields = JSON.parse(localStorage['bcs-recipe.fields']);
                        $.each(fields, function (i, field) {
                            var $fieldset = $('#values fieldset.template').clone();
                            var $input = $fieldset.find('input');
                            $fieldset.removeClass('hide');
                            $fieldset.removeClass('template');

                            $fieldset.find('label').html(field.name);
                            $input.attr('data-api', api(field));
                            $input.attr('data-key', field.element.split('-')[1]);
                            $input.attr('data-type', field.element.split('-')[0] === 'oc' ? 'number': 'time');
                            $input.attr('data-attr', field.element.split('-')[0] === 'oc' ? 'setpoint' : 'value');
                            
                            $.get(bcs.url + api(field), function (body) {
                                var value = $input.attr('data-type') === 'number' ? body[$input.attr('data-key')].setpoint / 10 : 
                                                                                   new bcslib.Time(body[$input.attr('data-key')].value / 10).toString();
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
                                
                                $.post(bcs.url + $input.attr('data-api'), JSON.stringify(data), function (body) {
                                    var value = $input.attr('data-type') === 'number' ? body[$input.attr('data-key')].setpoint / 10 : 
                                                                                       new bcslib.Time(body[$input.attr('data-key')].value / 10).toString();
                                    $input.val(value);
                                });
                                
                            });
                            
                            $('#values .fields button').before($fieldset);
                        });
                    }
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
        Set up button onclick for Save button on settings page
    */
    $('#setup button').on('click', function () {
        event.preventDefault();
        
        var fieldSettings = [];
        
        $('#setup .fields div.form-group').each(function (i, form) {
            var $form = $(form);
            var field = {
                name: $form.find('[data-name=variable]').val(),
                process: $form.find('[data-name=targetProcess]').val(),
                state: $form.find('[data-name=targetState]').val(),
                element: $form.find('[data-name=targetElement]').val()
            };
            fieldSettings.push(field);
        });
        
        localStorage['bcs-recipe.fields'] = JSON.stringify(fieldSettings);
    });
    
    $('#setup a.new').on('click', newSetupField);
    
    $('#setup a.remove').on('click', function (event) {
        event.preventDefault();

        var $fieldset = $(event.target).parents('fieldset');
        if($fieldset.find('div.form-group').attr('data-id') !== "0") {
            $fieldset.remove();
        } else {
            $fieldset.find('[data-name]').val('');
        }
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