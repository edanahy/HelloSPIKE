
/*
Airtable_script.js
Edited 11-13-20
Ethan Danahy, Teddy Robbins, Jeremy Jung, Grace Kayode
This is for Dr. E's EN1 class final projects (Fall 2020)
*/

// page type
var page_type; // local or remote

// global variables for interacting with Service Dock's Airtable Service
var airtableElement;
var my_airtable;
var my_SPIKE;

var do_alerts = false; // change to "false" to not show alerts

var header1 = "key";
var header2 = "app";
var header3 = "Hello";
var footer1 = "uzo6eMv8nBMyQ3";
var footer2 = "8rjr9bqItFXUuL";
var footer3 = "SPIKE";

var timeout_timer_val = 2000;

///////////////////////
// REMOTE PAGES CODE //
///////////////////////

function updateOnAirtable(key, newValue) {
    /* check if given key already exists on Airtable*/
    var names = my_airtable.getNames();
    var exists = false;
    for (var index in names) {
        if (names[index] == key) {
            exists = true;
            break;
        }
    }
    // added to overcome "trim" error in ServiceDock
    if (String(newValue).length == 0) { newValue = ' '; }

    // key already exists, only update
    if (exists) {
        // update key and value on Airtable
        my_airtable.updateValue(key, newValue);
    }
    // key does not exist, create a new pair
    else {
        my_airtable.createNameValuePair(key, newValue)
    }
}

//Wrapper functions for updating airtable based on button, slider, and text input
function button_function(elem) {
    // retrieve key & value pairs from buttons' attributes
    var key = elem.getAttribute('airtable_value');
    var newValue = elem.innerHTML;

    // update or create Name & Value pair on Airtable
    updateOnAirtable(key, newValue);

    // alert user of change
    if (do_alerts) {
      alert('Set airtable attribute "' + key + '" to be "' + newValue + '"');
    }

}
function range_function(elem) {
    // retrieve key & value pairs from buttons' attributes
    var key = elem.getAttribute('airtable_value');
    var newValue = elem.value;

    // update or create Name & Value pair on Airtable
    updateOnAirtable(key, newValue);

    // alert user of change
    if (do_alerts) {
      alert('Set airtable attribute "' + key + '" to be "' + newValue + '"');
    }
}

function text_function(elem){
    // retrieve key & value pairs from buttons' attributes
    var key = elem.getAttribute('airtable_value');
    var newValue = elem.value;

    // update or create Name & Value pair on Airtable
    updateOnAirtable(key, newValue);

    // alert user of change
    if (do_alerts) {
      alert('Set airtable attribute "' + key + '" to be "' + newValue + '"');
    }
}

//Setup (FOR REMOTE PAGES) for assigning elements to wrapper functions
function setup_remote() {
    d = document.querySelectorAll("button");
    for (i=0; i<d.length; i++) {
        d[i].onclick = function () { button_function(this); }
    }
    d = document.querySelectorAll("input[type=range]");
    for (i=0; i<d.length; i++) {
        d[i].onclick = function () { range_function(this); }
    }
    d = document.querySelectorAll("form[type=textinput]");
    for (i=0; i<d.length; i++) {

        var current_form = d[i];
        var text_entry = d[i].elements[0];
        var submit_button = d[i].elements[1];

        submit_button.onclick = function () { text_function(text_entry); }

    }
}

//////////////////////
// LOCAL PAGES CODE //
//////////////////////
var check_array = []; // global array of states to check

function search_and_replace(string_in, vals_in) {
  string_out = string_in;
  // replace with all the user defined properties
  // FIND: REPLACE[name_val] and replace it
  string_out = string_out.replace(/REPLACE\[compare_type\]/g, vals_in["compare_type"]);
  string_out = string_out.replace(/REPLACE\[action_type\]/g, vals_in["action_type"]);
  string_out = string_out.replace(/REPLACE\[name_val\]/g, vals_in["name_val"]);
  string_out = string_out.replace(/REPLACE\[prev_val\]/g, vals_in["prev_val"]);
  string_out = string_out.replace(/REPLACE\[value_val\]/g, vals_in["value_val"]);
  string_out = string_out.replace(/REPLACE\[action_val\]/g, vals_in["action_val"]);
  string_out = string_out.replace(/REPLACE\[code_val\]/g, vals_in["code_val"]);
  string_out = string_out.replace(/REPLACE\[reset_val\]/g, vals_in["reset_val"]);
  // any airtable values that need to be looked up and replaced
  // FIND: AIRTABLE[name_val] and replace it
  var r = new RegExp(/AIRTABLE\[[^\]]*\]/,'g'); // match: AIRTABLE[ + variablename + ]
  var matches = string_out.match(r);
  // if not null
  if (matches) {
    // match is index into matches (0, 1, ...)
    for (match in matches) {
      // get the field, look up the name in airtable, and replace it
      var name_val = matches[match].substring(9);
      name_val = name_val.substring(0,name_val.length-1);
      string_out = string_out.replace(matches[match], my_airtable.getValue(name_val));
    }
  }
  return string_out;
}

// takes a DIV and returns a JSON data structure with various values
function get_div_vals(div_in) {
	// JSON data structure:
	vals = {
		"compare_type": "",
		"action_type": "",
		"name_val": "",
		"prev_val": "",
		"value_val": "",
		"action_val": "",
		"code_val": "",
		"reset_val": null
	};
	vals["compare_type"] = div.getAttribute("compare");
	vals["action_type"] = div.getAttribute("action");
	try { vals["name_val"] = div.querySelectorAll("input[id=name_val]")[0].value; }
	catch { vals["name_val"] = ""; }
	try { vals["prev_val"] = div.querySelectorAll("input[id=prev_val]")[0].value; }
	catch { vals["prev_val"] = ""; }
	try { vals["value_val"] = div.querySelectorAll("input[id=value_val]")[0].value; }
	catch { vals["value_val"] = ""; }
	try { vals["action_val"] = div.querySelectorAll("input[id=action_val]")[0].value; }
	catch { vals["action_val"] = ""; }
	try { vals["code_val"] = div.querySelectorAll("textarea[id=code_val]")[0].value; }
	catch { vals["code_val"] = ""; }
	try { vals["reset_val"] = div.querySelectorAll("input[id=reset_val]")[0].value; }
	catch { vals["reset_val"] = null; }
	return vals;
}

// alert if the SPIKE Prime has not been initialized
function init_spike_error(error_type) {
	alert("You must activate the SPIKE Service first (" + error_type + ").");
}

function reset_airtable(vals) {
	// if a reset val has been provided:
	if (vals["reset_val"] != null) {
    // update airtable
		updateOnAirtable(vals["name_val"], vals["reset_val"]);
	}
}

function run_js_code(vals) {
  // function to run is in "action_val"
  // pass it "name_val" and "value_val"

  // function we want to run
  var fnstring = vals["action_val"];
  // find object
  var fn = window[fnstring];
  // is object a function?
  // if so, pass it name_val and value_val
  if (typeof fn === "function") {
    fn(vals["name_val"], vals["value_val"]);
  } else {
    console.log("ERROR: couldn't find the function " + fnstring);
  }
}

// function that executes the SPIKE Prime action
function do_action(vals) {
	if (vals["action_type"] == "run-slot") {
		// slot number is stored in variable action_val
		if (my_SPIKE.isActive()) {
			my_SPIKE.executeProgram(parseInt(vals["action_val"]));
			reset_airtable(vals); // after executing, check if need to reset
		} else {
			init_spike_error(vals["action_type"]);
		}
	} else if (vals["action_type"] == "stop-slot") {
		if (my_SPIKE.isActive()) {
			my_SPIKE.stopCurrentProgram();
			reset_airtable(vals); // after executing, check if need to reset
		} else {
			init_spike_error(vals["action_type"]);
		}
	} else if (vals["action_type"] == "download-code") {
		if (my_SPIKE.isActive()) {
			// action_val is the slotID
			// code_val is the code to download
      new_code = search_and_replace(vals["code_val"], vals);
			my_SPIKE.writeProgram(
				"test",
				new_code,
				parseInt(vals["action_val"]),
				function() {
					my_SPIKE.executeProgram(parseInt(vals["action_val"]));
				}
			);
			reset_airtable(vals); // after executing, check if need to reset
		}
  } else if (vals["action_type"] == "run-js") {
    run_js_code(vals);
    reset_airtable(vals); // after executing, check if need to reset
	} else {
		alert("Trying to do unknown action: " + vals["action_type"] + " (" + vals["action_val"] + ")");
	}
}

// sets HTML attribute (used mostly for updating the style on the airtable)
function set_attribute(div_in, selector, attr, new_value) {
	// e.g. div, "table", and "class" to "airtable_active"
	try { div_in.querySelectorAll(selector)[0].setAttribute(attr, new_value); }
	catch { alert("error setting attribute: " + selector); }
}

// MAIN CHECK FUNCTION
// - compares previous value to current value, looking for change
// - calls "do_action" if an action should happen!
function airtable_check() {
	for (i=0; i<check_array.length; i++) {
		div = check_array[i];
		vals = get_div_vals(div);

		// look up the current value stored in Airtable
		airtable_val = my_airtable.getValue(vals["name_val"]);

		if (vals["compare_type"] == "changes") {

			// if new value
			if (!(vals["prev_val"] == airtable_val)) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

		} else if (vals["compare_type"] == "equal") {

			// if new value and it matches the expected value
			if (!(vals["prev_val"] == airtable_val) && airtable_val == vals["value_val"]) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

    } else if (vals["compare_type"] == "not-equal") {

			// if new value and it matches the expected value
			if (!(vals["prev_val"] == airtable_val) && airtable_val != vals["value_val"]) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

		} else if (vals["compare_type"] == "less-than") {

			// if new value and it matches the expected value
			if (!(vals["prev_val"] == airtable_val) && parseInt(airtable_val) < parseInt(vals["value_val"])) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

		} else if (vals["compare_type"] == "greater-than") {

			// if new value and it matches the expected value
			if (!(vals["prev_val"] == airtable_val) && parseInt(airtable_val) > parseInt(vals["value_val"])) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

    } else if (vals["compare_type"] == "longer-than") {

			// if new value and it matches the expected value
			if (!(vals["prev_val"] == airtable_val) && airtable_val.toString().length > parseInt(vals["value_val"])) {
				// then it's a match!
				set_attribute(div, "table", "class", "airtable_active");
				do_action(vals);
			} else { set_attribute(div, "table", "class", "airtable_inactive"); }

			// update prev value to match what's in airtable (because looking for change next time around)
			set_attribute(div, "input[id=prev_val]", "value", airtable_val);

		} else {
			alert("unknown compare type (" + vals["compare_type"] + ") in div #" + i + "; please check");
		}
	}
	setTimeout(airtable_check,timeout_timer_val);
}

// by-passes the value check and just executes the action
// this is for manual override during debugging
function force_action(div_num) {
	div = check_array[div_num];
	vals = get_div_vals(div);

	// now force an action to execute
	set_attribute(div, "table", "class", "airtable_active");
	do_action(vals);
}

// when the page loads (and after Airtable Service initialized)
// this goes through and sets all the "prev values" to what's currently
// in the Airtable database (so have something to compare to)
function init_prev_val() {
	for (i=0; i<check_array.length; i++) {
		div = check_array[i];
		vals = get_div_vals(div);
		// look up the current value stored in Airtable
		airtable_val = my_airtable.getValue(vals["name_val"]);
		// update prev value to match what's in airtable (because looking for change next time around)
		set_attribute(div, "input[id=prev_val]", "value", airtable_val);
	}
	// now start checking
	setTimeout(airtable_check,timeout_timer_val);
}

// this is a setup function for local pages
// - takes default HTML elements and creates tables with textboxes/etc
function setup_local() {
	d = document.querySelectorAll("div[type=airtable-check]");
	for (i=0; i<d.length; i++) {
		div = d[i];
		vals = get_div_vals(div);

		compare_text = "";
		switch (vals["compare_type"]) {
			case "changes":
				compare_text = "changes at all"
				break;
			case "equal":
				compare_text = "equals";
				break;
      case "not-equal":
				compare_text = "not equal to";
				break;
			case "less-than":
				compare_text = "less than";
				break;
			case "greater-than":
				compare_text = "greater than";
				break
      case "longer-than":
				compare_text = "is longer than";
				break
		}

		html = "";
		html += "<input type=hidden id='prev_val' value='" + vals["value_val"] + "'>"; // airtable not set up yet, so can't use real data yet
		html += "<table class='airtable_inactive'><tr>";
		html += "<td>If Name</td><td><input type=text id='name_val' value='" + vals["name_val"] + "'></td>";

		if (vals["compare_type"] == "changes") {
			html += "<td colspan=2><b><em>" + compare_text + "</em></b></td>";
		} else {
			html += "<td>now <b><em>" + compare_text + "</em></b> Value </td><td><input type=text id='value_val' value='" + vals["value_val"] + "'></td>";
		}

		if (vals["action_type"] == "run-slot") {
			html += "<td>then run SPIKE slot</td><td><input type=text size=4 id='action_val' value='" + vals["action_val"] + "'></td>";
		} else if (vals["action_type"] == "stop-slot") {
			html += "<td colspan=2>then stop executing any running programs</td>";
		} else if (vals["action_type"] == "download-code") {
			html += "<td>then into slot <input type=text size=4 id='action_val' value='" + vals["action_val"] + "'> download/run code</td>";
			html += "<td><textarea id='code_val' cols=40 rows=6>" + vals["code_val"] + "</textarea></td>";
		} else if (vals["action_type"] == "run-js") {
      html += "<td>then run the JavaScript function <input type=text id='action_val' value='" + vals["action_val"] + "'></td>";
    }

		if (vals["reset_val"] != null) {
			html += "<td>and after reset Value to <input type=text id='reset_val' value='" + vals["reset_val"] + "'></td>";
		} else { html+= "<td></td>"; }

		html += "<td><input type=button value='force' onclick='force_action(" + i + ")'></td></tr></table>";
		div.innerHTML = html;
		check_array.push(div);
	}
}

// function to refesh the iframe holding embedded airtable data
function refresh_embedded_airtable() {
	// set the src to the src (forces refresh)
	document.querySelectorAll('iframe[class=airtable-embed]')[0].src = document.querySelectorAll('iframe[class=airtable-embed]')[0].src;
	return false; // return false so doesn't reload the page
}

//////////////////////
//    INITIALIZER   //
//////////////////////
window.addEventListener('load', function () {
    // check to see if this page is a "local" or "remote" page
    // this is an attribute of the body tag
    page_type = document.querySelectorAll("body")[0].getAttribute("type");
    // setup the onclick listeners for the interactive webpage elements
    if (page_type == "local") {
	    setup_local();
    } else if (page_type == "remote") {
        setup_remote();
    } else {
	    alert("page type unknown: " + page_type);
    }

    // setup the ServiceDock
    airtableElement = document.getElementById("service_airtable");
    var secret1 = header1 + footer1;
    var secret2 = header2 + footer2;
    var secret3 = header3 + footer3;
    airtableElement.setAttribute("apikey", secret1);
    airtableElement.setAttribute("baseid", secret2);
    airtableElement.setAttribute("tablename", secret3);
    airtableElement.init();
    my_airtable = airtableElement.getService();
    if (page_type == "local") {
	    // SPIKE service
	    my_SPIKE = document.getElementById("service_spike").getService();
	}

	if (page_type == "local") {
		setTimeout(init_prev_val,timeout_timer_val);
	}

});
