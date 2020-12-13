
/*
cloud.js
Written by:
  Ethan Danahy
Inspired by original (previous) code written by:
  Ethan Danahy, Teddy Robbins, Jeremy Jung, Grace Kayode
Purpose:
  Creating simple interactive web-based interfaces for SPIKE Prime control
  using Cloud-based storage (Airtable or SystemLink)
*/

// Service Dock connections (global variables)
var cloud_connection; // Service Dock pointer for connecting to cloud service
var cloud_connection_type; // "Airtable" and "SystemLink" are two allowed types
var spike_connections; // array of SPIKE connections (e.g. in case multiple)
var mySPIKE; // the first SPIKE connection in the array of SPIKE connections

// how often to check (poll) cloud data for updates
var monitor_cloud_frequency = 2000; // in ms

// this is a global "interactive HTML" variable
var iHTML = null; // see: function interactiveHTML()

// function to refesh the iframe holding embedded airtable data
function refresh_embedded_airtable() {
	// set the src to the src (forces refresh)
	document.querySelectorAll('iframe[class=airtable-embed]')[0].src = document.querySelectorAll('iframe[class=airtable-embed]')[0].src;
	return false; // return false so doesn't reload the page
}

// Generate a (pseudo-)random string
// modified from: https://stackoverflow.com/a/1349462
function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

////// CLOUD FUNCTIONS //////

// AIRTABLE CLOUD UPDATE: set the key to value
function cloud_update_airtable(key, newValue) {
  // check if key already exists on Airtable*/
  var names = cloud_connection.getNames();
  var exists = false;
  for (var index in names) {
      if (names[index] == key) {
          exists = true;
          break;
      }
  }
  // key already exists, only update
  if (exists) { cloud_connection.updateValue(key, newValue.toString()); }
  // key does not exist, create a new pair
  else { cloud_connection.createNameValuePair(key, newValue.toString()) }
}

// AIRTABLE CLOUD GET: get the value for a particular key
function cloud_get_airtable(key) {
  // SHOULD PROBABLY DO MORE CHECKING HERE
  return cloud_connection.getValue(key);
}

// SYSTEMLINK CLOUD UPDATE: set the key to value
function cloud_update_systemlink(key, newValue) {
  // check if key already exists on Airtable*/
  var names = cloud_connection.getTagsInfo();
  var exists = false;
  for (var index in names) {
      if (names[index] == key) {
          exists = true;
          break;
      }
  }
  // key already exists, only update
  if (exists) { cloud_connection.setTagValue(key, newValue.toString()); }
  // key does not exist, create a new pair
  else { cloud_connection.createTag(key, newValue.toString()) }
}

// SYSTEMLINK CLOUD GET: get the value for a particular key
function cloud_get_systemlink(key) {
  // SHOULD PROBABLY DO MORE CHECKING HERE
  return cloud_connection.getTagValue(key);
}

////// GENERIC CLOUD FUNCTIONS ///////

function cloud_isActive() {
  // HACK: return the number of fields in the cloud service
  // - this is because isActive() doesn't seem to be set up right
  return cloud_connection.isActive();
}

// update cloud: key/value pair
function cloud_update(key, newValue) {
  if (cloud_connection_type == "Airtable") { cloud_update_airtable(key, newValue); }
  if (cloud_connection_type == "SystemLink") { cloud_update_systemlink(key, newValue); }
}
// get cloud value for key
function cloud_get(key) {
  if (cloud_connection_type == "Airtable") { return cloud_get_airtable(key); }
  if (cloud_connection_type == "SystemLink") { return cloud_get_systemlink(key); }
}

// CLASS INTERACTIVE HTML:
// - for managing/running the interactive HTML elements
function interactiveHTML() {

  let monitor_cloud_list = Object(); // list of elements to monitor, indexed (key) by div_id
  let monitor_cloud_bool = false; // currently not monitoring cloud
  let monitor_cloud_id = 0; // id of the setTimeout of currently monitoring cloud variable

	// HACK because of "reset" bug
	let most_current_val = "";

  // private function for analyzing a DIV for parameters
  // - goes through element and pulls out sub data, building JSON data structure
  function get_div_params(div) {
    // JSON data structure:
  	vals = {
      "div_id": "none",
  		"cloud_compare": "",
  		"cloud_action": "",
  		"cloud_name": "",
  		"cloud_prev": "",
  		"cloud_value": "",
  		"cloud_action_val": "",
  		"cloud_code": "",
  		"cloud_reset": null
  	};
    vals["div_id"] = div.getAttribute("id"); // id of this DIV
    vals["cloud_compare"] = div.getAttribute("cloud_compare"); // what type of compare
    vals["cloud_action"] = div.getAttribute("cloud_action"); // what action to do if compare is true
    // some of the following might not exist, so "try" and "catch" if not present:
    try { vals["cloud_name"] = div.querySelectorAll("input[id=cloud_name]")[0].value; }
  	catch { vals["cloud_name"] = ""; }
  	try {
			vals["cloud_prev"] = div.querySelectorAll("input[id=cloud_prev]")[0].value;
			if (vals["cloud_prev"] === undefined) { vals["cloud_prev"] = ""; }
		}
  	catch { vals["cloud_prev"] = ""; }
  	try { vals["cloud_value"] = div.querySelectorAll("input[id=cloud_value]")[0].value; }
  	catch { vals["cloud_value"] = ""; }
  	try { vals["cloud_action_val"] = div.querySelectorAll("input[id=cloud_action_val]")[0].value; }
  	catch { vals["cloud_action_val"] = ""; }
  	try { vals["cloud_code"] = div.querySelectorAll("textarea[id=cloud_code]")[0].value; }
  	catch { vals["cloud_code"] = ""; }
  	try { vals["cloud_reset"] = div.querySelectorAll("input[id=cloud_reset]")[0].value; }
  	catch { vals["cloud_reset"] = null; }
  	return vals;
  }

	// select box (single drop down or multiselect)
	// is tricky for the "get_parameters" function,
	// so pulling code out here as separate function
	function get_parameters_from_select(elem) {
		var tmp_value = ""; // value to return
		var join_val = elem.getAttribute("cloud_join");
		if (join_val == null || join_val == undefined) { join_val = ""; }
		if (elem.selectedOptions.length > 1) {
			// multiple elements selected; find the cloud_join value
			tmp_value = "";
			for (var i=0; i<elem.selectedOptions.length; i++) {
				// if not the first one, add a join_val between entries
				if (i>0) { tmp_value += join_val; }
				// get the value of the option (either cloud_value text or innerHTML if no cloud_value specified)
				var tmp_cloud_value = elem.selectedOptions[i].getAttribute("cloud_value");
				if (tmp_cloud_value == null || tmp_cloud_value == undefined) {
					// no cloud_value specified, so use the innerHTML of the <option> tag instead
					tmp_cloud_value = elem.selectedOptions[i].innerHTML;
				}
				tmp_value += tmp_cloud_value;
			}
		} else if (elem.selectedOptions.length == 1) {
			// one single element selected
			var tmp_value = elem.selectedOptions[0].getAttribute("cloud_value");
			if (tmp_value == null || tmp_value == undefined) {
				// no cloud_value specified, so use the innerHTML of the <option> tag instead
				tmp_value = elem.selectedOptions[0].innerHTML;
			}
		} else {
			// none selected:
			tmp_value = ""; // clear value
		}
		return tmp_value;
	}

  // takes in an HTML element and looks up (the cloud) attributes of the tag
  // e.g. <input type=button cloud_name="command" cloud_value="Forward">
  function get_parameters(elem) {
    // "value" might be an HTML attribute of tag, or the innerHTML of the element
    // - check if attribute exists first, then default to innerHTML if not
		// - <select ...> boxes are special case (get value of the selected option)
    var tmp_value = elem.getAttribute("cloud_value");
    if (tmp_value == null || tmp_value == undefined) {
      if (elem.tagName == "BUTTON") { tmp_value = elem.innerHTML; }
      if (elem.tagName == "INPUT") { tmp_value = elem.value; }
			if (elem.tagName == "SELECT") { tmp_value = get_parameters_from_select(elem); }
			if (elem.tagName == "TEXTAREA") { tmp_value = elem.value; }
    }
    // return a params OBJECT data structure
    return {
      action: elem.getAttribute("cloud_action"),
      key: elem.getAttribute("cloud_name"),
      list: elem.getAttribute("cloud_list"),
      min: elem.getAttribute("cloud_min"),
      max: elem.getAttribute("cloud_max"),
			join: elem.getAttribute("cloud_join"),
      value: tmp_value
    }
  }

  // search and replace: updates a string with new values
  function search_and_replace_params(string_in, params) {
    var string_out = string_in;
    // replace with all the user defined properties
    // FIND: REPLACE[name_val] and replace it
    string_out = string_out.replace(/REPLACE\[cloud_compare\]/g, params["cloud_compare"]);
    string_out = string_out.replace(/REPLACE\[cloud_action\]/g, params["cloud_action"]);
    string_out = string_out.replace(/REPLACE\[cloud_name\]/g, params["cloud_name"]);
    string_out = string_out.replace(/REPLACE\[cloud_prev\]/g, params["cloud_prev"]);
    string_out = string_out.replace(/REPLACE\[cloud_value\]/g, params["cloud_value"]);
    string_out = string_out.replace(/REPLACE\[cloud_current\]/g, params["cloud_current"]);
    string_out = string_out.replace(/REPLACE\[cloud_action_val\]/g, params["cloud_action_val"]);
    string_out = string_out.replace(/REPLACE\[cloud_code\]/g, params["cloud_code"]);
    string_out = string_out.replace(/REPLACE\[cloud_reset\]/g, params["cloud_reset"]);
    // any cloud values that need to be looked up and replaced
    if (cloud_isActive()) {
      // FIND: all instances of CLOUD[name_val] in string and replace it with looked up value
      var r = new RegExp(/CLOUD\[[^\]]*\]/,'g'); // match: CLOUD[ + variablename + ]
      var matches = string_out.match(r);
      // if not null
      if (matches) {
        // match is index into matches (0, 1, ...)
        for (match in matches) {
          // get the field, look up the name in airtable, and replace it
          var name_val = matches[match].substring(6);
          name_val = name_val.substring(0,name_val.length-1);
          string_out = string_out.replace(matches[match], cloud_get(name_val));
        }
      }
    }
    return string_out;
  }

  // sets the table within the elem to be "active" or "inactive"
  function set_table_active(elem, bool_in) {
    var table_elem = elem.querySelector("table");
    if (bool_in) {
      // is active: set active class (and remove inactive)
      table_elem.classList.add("cloud_active");
      table_elem.classList.remove("cloud_inactive");
    } else {
      // is NOT active: set inactive class (and remove active)
      table_elem.classList.remove("cloud_active");
      table_elem.classList.add("cloud_inactive");
    }
  }

  // function that calls a local JS function specified by the user
  // - this is if the action_val is "run_js"
  // - the cloud_name and cloud_value is passed along to JS function
  function local_run_js_code(params) {
    // function we want to run
    var fnstring = params["cloud_action_val"];
    // find object (function to be called)
    var fn = window[fnstring];
    // is object a function?
    // if so, pass it cloud_name and cloud_value
    if (typeof fn === "function") {
      fn(params["cloud_name"], params["cloud_current"]);
    } else {
      console.log("ERROR in local_run_js_code: couldn't find the function " + fnstring);
    }
  }

  // this is an error message
  function init_spike_error(error_type) {
    console.log("ERROR with SPIKE Prime: it must be activated first");
		console.log("- debugging info: " + error_type);
    alert("You must activate the SPIKE Service first\n\nDebugging info: " + error_type);
  }

  // check params to see if there is a reset value
  // - if so, then reset the cloud value to the new value
  // (this is executed after a command has been run)
  function cloud_do_reset(params) {
    if (cloud_isActive()) {
      // if a reset value has been provided:
      if (params["cloud_reset"] != null) {
        cloud_update(params["cloud_name"], params["cloud_reset"]);
				most_current_val = params["cloud_reset"];
      }
    } else { console.log("ERROR in cloud_do_reset: cloud is not active"); }
  }

  // based on the parameters sent in, perform the action specified
  function cloud_do_action(params) {
    console.log("IN CLOUD_DO_ACTION for div:" + params["div_id"] + " (name: " + params["cloud_name"] + ", compare: " + params["cloud_compare"] + ", prev: " + params["cloud_prev"] + ", value: " + params["cloud_value"] + ", current: " + params["cloud_current"] + ")");
    switch (params["cloud_action"]) {
      case "run_slot":
        if (mySPIKE && mySPIKE.isActive()) {
          mySPIKE.executeProgram(parseInt(params["cloud_action_val"]));
          cloud_do_reset(params); // after executing action, do reset (if present)
        } else { init_spike_error("in cloud_do_action/run_slot (" + params["div_id"] + ")"); }
        break;
      case "stop_slot":
        if (mySPIKE && mySPIKE.isActive()) {
          mySPIKE.stopCurrentProgram();
          cloud_do_reset(params); // after executing action, do reset (if present)
        } else { init_spike_error("in cloud_do_action/stop_slot (" + params["div_id"] + ")") }
        break;
      case "download_code":
        if (mySPIKE && mySPIKE.isActive()) {
          // download and run program
          var prog_name = "prog";
          var new_code = search_and_replace_params(params["cloud_code"], params);
					mySPIKE.stopCurrentProgram();
          mySPIKE.writeProgram(prog_name, new_code, parseInt(params["cloud_action_val"]),
            function() { mySPIKE.executeProgram(parseInt(params["cloud_action_val"])); }
    			);
          cloud_do_reset(params); // after executing action, do reset (if present)
        } else { init_spike_error("in cloud_do_action/download_code (" + params["div_id"] + ")") }
        break;
      case "run_js":
        local_run_js_code(params); // run user defined JS code, if specified
        cloud_do_reset(params); // after executing action, do reset (if present)
				break;
      default:
        console.log("ERROR in cloud_do_action: unknown cloud action (" + params["cloud_action"] + ")");
    }
  }

  function force_action(div_id) {
    elem = monitor_cloud_list[div_id];
    var params = get_div_params(elem);
    set_table_active(elem, true);
    cloud_do_action(params);
  }

  // monitor a particular element, and perform action if necessary
  // - note: cloud must be active for this to work
  function cloud_monitor_check(elem) {
    if (cloud_isActive()) {
      var params = get_div_params(elem);
      // look up the current value stored in cloud
      params["cloud_current"] = cloud_get(params["cloud_name"]);
			most_current_val = params["cloud_current"];
      var match = false; // this determines if attributes matched and action needs to happen
      // now, based on settings of the element, perform the proper action:
      switch (params["cloud_compare"]) {
        case "changes":
          // if it's changed (at all):
          if (!(params["cloud_prev"] == params["cloud_current"]))
            { match = true; }
          break;
        case "equal":
            if (!(params["cloud_prev"] == params["cloud_current"]) && params["cloud_current"] == params["cloud_value"])
            { match = true; }
          break;
        case "less-than":
          if (!(params["cloud_prev"] == params["cloud_current"]) && params["cloud_current"] < params["cloud_value"])
            { match = true; }
          break;
        case "greater-than":
          if (!(params["cloud_prev"] == params["cloud_current"]) && params["cloud_current"] > params["cloud_value"])
            { match = true; }
          break;
        default:
          // error:
          console.log("ERROR: in cloud_monitor_check (div: " + params["div_id"] + ") but cloud_compare = " + params["cloud_compare"]);
      }
      // done checking; now if there was a match, do the action specified
      if (match) {
        set_table_active(elem, true);
        cloud_do_action(params);
      } else {
        // nothing matched, make sure table (for this elem) is inactive:
        set_table_active(elem, false);
      }
      // set the prev_val to what the current value is, so only looks for change next time!
			// note: need to set it to be what is currently in the database
			elem.querySelector("input[id=cloud_prev]").setAttribute("value", ("" + most_current_val).toString());
    }
  }

  // initializes cloud check elements with any "previous value" already
  // stored in the cloud
  // - this is the PUBLIC function that starts the process
  function initialize_prev_val() {
    if (cloud_isActive()) { init_prev_val(); }
    else {
      // call ourselves in the future to check/try again
      setTimeout(initialize_prev_val, monitor_cloud_frequency);
    }
  }
  // - this is the private function that does the work
  function init_prev_val() {
    // go through all the cloud elements and look up any previous/exisitng values
    if (cloud_isActive()) {
      var keys = Object.keys(monitor_cloud_list);
      for (var i=0; i<keys.length; i++) {
        var elem = monitor_cloud_list[keys[i]];
        var params = get_div_params(elem);
        // 1. look up in cloud to see what current value is
        var pre_val = cloud_get(params["cloud_name"]);
        // 2. set the <input id="cloud_prev" ...> value
        elem.querySelectorAll("input[id=cloud_prev]")[0].value = pre_val;
      }
      // now that everything has been set up, can start monitoring
      monitor_cloud_start();
    } else {
      // cloud_isActive was false
      // SHOULD NOT GET HERE (because should have already been checked before calling function)
      console.log("ERROR: in init_prev_val but cloud is not active (cloud_isActive == false)");
    }
  }

  // monitor cloud start:
  function monitor_cloud_start() {
    monitor_cloud_id = setTimeout(monitor_cloud, monitor_cloud_frequency);
    monitor_cloud_bool = true;
  }
  // stop monitoring cloud
  function monitor_cloud_stop() {
    clearTimeout(monitor_cloud_id);
    monitor_cloud_bool = false;
  }

  // monitor cloud
  function monitor_cloud() {
    if (monitor_cloud_bool) {
      // go through each element of the monitor_cloud_list and check
      for (var key of Object.keys(monitor_cloud_list)) { cloud_monitor_check(monitor_cloud_list[key]); }
      // set up next check:
      if (monitor_cloud_bool) { monitor_cloud_start(); }
    } else {
      console.log("In monitor cloud, but monitor_cloud_bool = " + monitor_cloud_bool);
    }
  }

  // this performs the CLOUD Action (e.g. update value in cloud, increment value in cloud, etc)
  function perform_cloud_action(params) {
    console.log("PERFORM ACTION: Action: " + params.action + ", Key: " + params.key + ", Value: " + params.value);
    switch (params.action) {
      case "update":
        cloud_update(params.key, params.value);
        break; // END OF "update" CASE
      case "increment":
        var updated_val = parseInt(cloud_get(params.key));
        // if it wasn't a number, set to zero
        if (isNaN(updated_val)) { updated_val = 0; }
        // increment the value
        updated_val = updated_val + parseInt(params.value);
        // make sure within range (less or equal than max, greater or equal than min)
        if (params.max != null && params.max != undefined) {
          var tmp_max = parseInt(params.max);
          if (!isNaN(tmp_max)) { updated_val = Math.min(updated_val, tmp_max); }
        }
        if (params.min != null && params.min != undefined) {
          var tmp_min = parseInt(params.min);
          if (!isNaN(tmp_min)) { updated_val = Math.max(updated_val, tmp_min); }
        }
        // update cloud with new value
        cloud_update(params.key, updated_val)
        break; // END OF "increment" CASE
      case "toggle":
        if (params.list != null && params.list != undefined) {
          var toggle_list = params.list.toString().split(",");
          if (toggle_list.length > 1) {
            // look up current value in the list and find the index
            var current_val = cloud_get(params.key).toString();
            var index = toggle_list.indexOf(current_val);
            if (index >= 0) {
              // set the updated value to be the next item in the toggle list
              // - do modular arithmitic to make sure we "loop" back around to start of list
              updated_val = toggle_list[(index+1)%toggle_list.length];
            } else {
              // not found, set to first value
              updated_val = toggle_list[0];
            }
            cloud_update(params.key, updated_val);
          } else if (toggle_list.length == 1) {
            // if only one element in the list, update to that value
            cloud_update(params.key, toggle_list[0]);
          } else {
            // some other error?
            console.log("TOGGLE ERROR: list is empty? " + toggle_list);
          }
        } else { console.log("TOGGLE ERROR: input list is null or undefined: " + toggle_list); }
        break; // END OF "toggle" CASE
    }
  }

  // adding button element to page: onclick event
  function add_element_button(elem) {
    elem.onclick = function () { perform_cloud_action(get_parameters(elem)); }
  }
  // adding input element to page: onchange event
  function add_element_input(elem) {
    elem.onchange = function () { perform_cloud_action(get_parameters(elem)); }
  }
  // adding form element to page: onsubmit event
  function add_element_form(elem) {
    // get the (hopefully only) submit button
    var submit_button = elem.querySelectorAll("input[type=submit]")[0];
    // what type of form is this?
    var form_type = elem.getAttribute("cloud_form");
    if (form_type == "input") {
      // this form has an input field that should be processed
      // when the submit button is pressed
      // (1) get the input (or inputs, as might be more than one)
      var input = elem.querySelectorAll("input[cloud_action=update], input[cloud_action=increment]");
      // (2) perform action on the input when submit button pressed (form submitted)
      elem.onsubmit = function () {
        for (var i=0; i<input.length; i++) {
          perform_cloud_action(get_parameters(input[i]));
        }
        return false; // make sure the form doesn't actually submit (go somewhere else)
      }
		} else if (form_type == "textarea") {
			// this form has a textarea that should be processed
			// when the submit button is pressed
			// (1) get the textarea
			var input = elem.querySelectorAll("textarea");
			// (2) perform action on the textarea when submit button pressed (form submitted)
			elem.onsubmit = function () {
				for (var i=0; i<input.length; i++) {
					perform_cloud_action(get_parameters(input[i]));
				}
				return false; // make sure the form doesn't actually submit (go somewhere else)
			}
    } else {
      console.log("ADD ELEMENT FORM ERROR: unknown form type (" + form_type + ")");
    }
  }
	// adding select element to page: onchange event
  function add_element_select(elem) {
    elem.onchange = function () { perform_cloud_action(get_parameters(elem)); }
  }
	// adding textarea element to page: onchange event
  function add_element_textarea(elem) {
    elem.onchange = function () { perform_cloud_action(get_parameters(elem)); }
  }

  // this function returns a text (sentence) explaining what the cloud check is
  // - similar to add_element_div but instead of creating HTML it creates a text sentence
  function get_cloud_check_element_text(elem) {
    var text = "";
    // look up all the attributes associated with this DIV
    var params = get_div_params(elem);
    // generate the "compare text" to print
    var compare_text = "";
    switch (params["cloud_compare"]) {
      case "changes":       compare_text = "changes at all"; break;
      case "equal":         compare_text = "equals"; break;
      case "less-than":     compare_text = "less than"; break;
      case "greater-than":  compare_text = "greater than"; break;
      default: compare_text = "";
    }
    text += "if Name " + params["cloud_name"] + " "
    // CHANGES:
    if (compare_text == "") {
      text += compare_text + " ";
    } else {
      text += "now " + compare_text + " Value " + params["cloud_value"] + " ";
    }
    // ACTION:
    switch (params["cloud_action"]) {
      case "run-slot": text += "then run SPIKE slot #" + params['cloud_action_val'] + " "; break;
      case "stop-slot": text += "then stop executing any running programs "; break;
      case "download-code": text += "then into slot #" + params['cloud_action_val'] + " download/run code "; break;
    }
    // RESET:
    if (params["cloud_reset"] != null) {
      text += "and after reset Value to " + params['cloud_reset'] + " ";
    }
    return text;
  }

  // add the DIV elements (cloud check)
  function add_element_div(elem) {
    // generate a random ID for this div
    // - **POTENTIAL BUG:** might be overwriting existing ID that user is using somehow?
    elem.setAttribute("id", randomString(10));
    // look up all the attributes associated with this DIV
    var params = get_div_params(elem);
    // generate the "compare text" to print
    var compare_text = "";
    switch (params["cloud_compare"]) {
      case "changes":       compare_text = "changes at all"; break;
      case "equal":         compare_text = "equals"; break;
      case "less-than":     compare_text = "less than"; break;
      case "greater-than":  compare_text = "greater than"; break;
      default: compare_text = "";
    }

    // GENERATE INNER HTML FOR THE DIV:
    var html = ""; // new html to put into the div
    // PREV VAL (not: cloud not yet set up, so can't set to actual cloud value)
    html += "<input type=hidden id='cloud_prev' value='" + params["cloud_value"] + "'>";
    // Create table:
    html += "<table class='cloud_table cloud_inactive'><tr>"; // set to be inactive to start
    // CLOUD NAME:
    html += "<td>If Name</td>";
    html += "<td><input type=text id='cloud_name' value='" + params["cloud_name"] + "'></td>";
    // CHANGES:
    switch (params["cloud_compare"]) {
      case "changes":
        // if "changes at all"
        html += "<td colspan=2><b><em>" + compare_text + "</em></b></td>";
        break;
      default:
        // if compares to specified value
        html += "<td>now <b><em>" + compare_text + "</em></b> Value</td><td><input type=text id='cloud_value' value='" + params["cloud_value"] + "'></td>";
    }
    // ACTION:
    switch (params["cloud_action"]) {
      case "run_slot":
        html += "<td>then run SPIKE slot #</td><td><input type=text size=3 id='cloud_action_val' value='" + params['cloud_action_val'] + "'></td>";
        break;
      case "stop_slot":
        html += "<td colspan=2>then stop executing any running programs</td>";
        break;
      case "download_code":
        html += "<td>then into slot #<input type=text size=3 id='cloud_action_val' value='" + params['cloud_action_val'] + "'> download/run code</td>";
        html += "<td><textarea id='cloud_code' cols=40 rows=6>" + params['cloud_code'] + "</textarea></td>";
        break;
			case "run_js":
				html += "<td>then run the JavaScript function <input type=text id='cloud_action_val' value='" + vals["cloud_action_val"] + "'></td>";
				break;
    }
    // RESET:
    if (params['cloud_reset'] != null) {
      html += "<td>and after reset Value to <input type=text id='cloud_reset' value='" + params['cloud_reset'] + "'></td>";
    } else {
      // no reset
      html += "<td></td>";
    }
    // FORCE BUTTON:
    html += "<td><input type=button value='Force' onclick='iHTML.force_action(\"" + params['div_id'] + "\");'></td></tr></table>";
    elem.innerHTML = html;
    // now need to add this elem to an array of items to check
    monitor_cloud_list[params['div_id']] = elem;
  }

  // add single element
  function add_element(elem) {
    if (elem != null) {
      var tagName = elem.tagName;
      if (tagName == "BUTTON") { add_element_button(elem); }
      if (tagName == "INPUT") { add_element_input(elem); }
      if (tagName == "FORM") { add_element_form(elem); }
      if (tagName == "DIV") { add_element_div(elem); }
			if (tagName == "SELECT") { add_element_select(elem); }
			if (tagName == "TEXTAREA") { add_element_textarea(elem); }
    } else {
      console.log("Error: in interactiveHTML.add_element and 'elem is null'")
    }
  }

  // add multiple elements at once (pass in array)
  function add_elements(elem_list) {
    if (elem_list != null && elem_list.length > 0) {
      for (var i=0; i<elem_list.length; i++) {
        this.add_element(elem_list[i]);
      }
    }
  }

  // public functions (returned during initialization)
  return {
    force_action : force_action, // force an action to happen (based on div_id)
    initialize_prev_val: initialize_prev_val, // function to initialize prev values
    monitor_cloud_list: monitor_cloud_list, // object array
    monitor_cloud_start: monitor_cloud_start, // function to start monitoring
    monitor_cloud_stop: monitor_cloud_stop, // function to stop monitoring
    add_element: add_element, // function to add single element
    add_elements: add_elements // function to add multiple elements
  }
}

// go through HTML elements and set them up
// - this converts simple HTML elements to more complex interactive ones
// - note: assumes "iHTML = new interactiveHTML();" has already been called
function page_setup_convert_HTML() {
  // go through HTML elements and configure to be interactive
  var d = null; // local tmp variable for pointing at page elements

  if (iHTML != null) {

    // TYPE #1: <button cloud_action="update" ...>
    // - button that, when clicked, will update the value stored in the cloud
    iHTML.add_elements(document.querySelectorAll("button[cloud_action=update]"));
    // TYPE #2: <button cloud_action="increment" ...>
    // - button that, when clicked, will update the value stored in the cloud
    iHTML.add_elements(document.querySelectorAll("button[cloud_action=increment]"));
    // TYPE #3: <button cloud_action="toggle" ...>
    // - button that, when clicked, will update the value stored in the cloud
    iHTML.add_elements(document.querySelectorAll("button[cloud_action=toggle]"));
    // TYPE #4: <input cloud_action="update" ...>
    // - other input types (text, range, etc) that, when changed, will update the value stored in the cloud
    // NOTE: don't want to select the inputs that are within the TYPE #6 (<form cloud_form="input")
    iHTML.add_elements(document.querySelectorAll("*:not([cloud_form=input]) > input[cloud_action=update]"));
    // TYPE #5: <input cloud_action="increment" ...>
    // - other input types (text, range, etc) that, when changed, will update the value stored in the cloud
    // NOTE: don't want to select the inputs that are within the TYPE #6 (<form cloud_form="input")
    iHTML.add_elements(document.querySelectorAll("*:not([cloud_form=input]) > input[cloud_action=increment]"));
    // TYPE #6: <form cloud_form="input" ...>
    // - with a <input cloud_action ...> like above (text, range, etc)
    // - and a <input type=submit ...> that triggers the action (vs. on input onchange)
    iHTML.add_elements(document.querySelectorAll("form[cloud_form=input]"));
		// - or with a <textarea cloud_action...> like in Type #8
		iHTML.add_elements(document.querySelectorAll("form[cloud_form=textarea]"));
		// TYPE #7: <select cloud_action="update" ...>
		// - with series of <option cloud_value='XXX'>text</option>
		// - changing the select box dropdown triggers the action
    iHTML.add_elements(document.querySelectorAll("select[cloud_action=update]"));
		// TYPE #8: <textarea cloud_action="update" ...>
		// - like button, it's the value of the textarea that becomes the cloud_value
    iHTML.add_elements(document.querySelectorAll("*:not([cloud_form=textarea]) > textarea[cloud_action=update]"));

    // setup the cloud-check elements
    // - of the form: <div type="airtable-check" ...>
    iHTML.add_elements(document.querySelectorAll("div[type=cloud_check]"));

  } else {
    // iHTML hasn't been set up yet; throw error
    console.log("ERROR: iHTML is null/hasn't been set up yet (in page_setup_convert_HTML)");
  }
}

//////////////////////
//    INITIALIZER   //
//////////////////////
window.addEventListener('load', function () {

  // On page load, these are the things that should happen (in order):
  // 1. call "onload_pre()" if function exists
  // 2. modify simple HTML elements to be more complex interactive elements
  // 3. set up the Service Dock cloud service (if exists)
  // 4. set up any Service Dock SPIKE Prime services (0, 1, or multiple)
  // 5. call "onload_post()" if function exists

  // 1. CHECK TO SEE IF A "PRE" FUNCTION NEEDS TO RUN
  // - this is a function called "onload_pre()" defined
  //   and should run before the rest of the page is set up
  // - this is useful for setting up (overriding?) variables/etc
  // find function
  var pre_fn_to_run = window["onload_pre"];
  if (typeof pre_fn_to_run === "function") {
    console.log("Page loaded: calling onload_pre");
    pre_fn_to_run();
  }

  // 2. go through the HTML elements in the page and set them up
  // - this is the code that "expands" simple HTML elements
  //   into more complex interactive elements
  iHTML = new interactiveHTML();
  page_setup_convert_HTML();

  // set up the Service Dock
  // - Service Dock is for interacting with services (cloud, hardware, etc)
  // - this implementation supports cloud services and SPIKE Prime HW
  // - cloud services can be Airtable OR SystemLink
  // - there can be any number of SPIKE Prime services attached

  // 3. Set up cloud service
  // - Test for Airtable Service:
  var cloud_service = document.getElementsByTagName("service-airtable");
  if (cloud_service != null && cloud_service.length > 0) {
    // found "service-airtable" service, so initialize
    cloud_connection_type = "Airtable"; // global variable
    // initialize AirTable service
    var local_airtable_APIkey = airtable_api;
    var local_airtable_baseID = airtable_baseid;
    var local_airtable_tablename = cloud_service[0].getAttribute('tablename');
    cloud_service[0].setAttribute('apikey', local_airtable_APIkey);
    cloud_service[0].setAttribute('baseid', local_airtable_baseID);
    cloud_service[0].setAttribute('tablename', local_airtable_tablename);
    cloud_service[0].init(local_airtable_APIkey, local_airtable_baseID, local_airtable_tablename);
    // pointer to service:
    cloud_connection = cloud_service[0].getService();
  } else {
    // - Test for SystemLink Service:
    cloud_service = document.getElementsByTagName("service-systemlink");
    if (cloud_service != null && cloud_service.length > 0) {
      // found "service_systemlink" service, so initialize
      cloud_connection_type = "SystemLink"; // global variable
      // initialize SystemLink service
      var local_systemlink_APIkey = systemlink_api;
      cloud_service[0].setAttribute('apikey', local_systemlink_APIkey)
			cloud_service[0].init(local_systemlink_APIkey);
			// pointer to service:
      cloud_connection = cloud_service[0].getService();
    } else {
      // no service found
      console.log("CLOUD SERVICE: no service found");
      cloud_connection_type = "NONE"; // global variable
    }
  }

  // 4. Set up the SPIKE Prime Service(s):
  // - note: can be more than one SPIKE Prime Service on the page
  var sp_services = document.getElementsByTagName("service-spike");
  if (sp_services != null && sp_services.length > 0) {
    // found (at least one) "service-spike", so set up
    // go through each SPIKE Prime service:
    spike_connections = Array(); // initialize as an array
    for (var sp_service = 0; sp_service < sp_services.length; sp_service++) {
      // get the service
      var tmp_sp_service = sp_services[sp_service].getService();
      // make a global variable (based on tag id) that points at it
      window[sp_services[sp_service].getAttribute("id")] = tmp_sp_service;
      // add this service to our array of services
      spike_connections.push(tmp_sp_service);
    }
    // set up the first one
    mySPIKE = spike_connections[0];
  } else {
    // no SPIKE Prime service found
    console.log("SPIKE PRIME SERVICE: no service found")
    spike_connections = null; // global variable
    mySPIKE = null; // global variable
  }

  // 5. CHECK TO SEE IF A "POST" FUNCTION NEEDS TO RUN
  // - this is a function called "onload_post()" defined
  //   and should run after the rest of the page is set up
  // - this is useful for starting anything that relies on
  //   the rest of the page to be initialized/created/etc.
  var post_fn_to_run = window["onload_post"];
  if (typeof post_fn_to_run === "function") {
    console.log("Page loaded: calling onload_post");
    post_fn_to_run();
  }

  // 6. NEED TO SET UP "PREV VALUE" on any cloud check (monitor_cloud_list) items
  iHTML.initialize_prev_val();

});
