// FACE DETECTION FUNCTIONS
// Written by ETHAN DANAHY
// November 2020

// Global Variables:
var input_width = 640;
var input_height = 480;
var output_width = 320;
var output_height = 240;
var face_width = 100;
var face_height = 100;
var image_scale = 1;

// for making Black and White
var r_threshold = 128;
var g_threshold = 128;
var b_threshold = 128;

var face_box_offset = 20; // pixels

// canvas elements (configured in setup())
var video_canvas = null;
var face_detection_canvas = null;
var current_face_canvas = null;
var black_and_white_canvas = null;
var saved_face_canvas = null;

var tmp_face_canvas = null;

var save_face_boolean = false;

var detect_face_timeout = 200; // detect every 200ms

// Draw on top of image where the detected faces are
function drawFaceBox(canvas_in, detected_faces) {
	context_in = canvas_in.getContext('2d');
	if (detected_faces.length > 0) {
		/* draw detected area */
		df = detected_faces;
		for (var i = 0; i < df.length; i++) {

			// draw red circle
			context_in.lineWidth = 3;
			context_in.strokeStyle = 'rgba(230,87,0,0.8)';
			context_in.beginPath();
			context_in.arc((df[i].x + df[i].width * 0.5), (df[i].y + df[i].height * 0.5),
					(df[i].width + df[i].height) * 0.25 * 1.2, 0, Math.PI * 2);
			context_in.stroke();

			// draw yellow box
			context_in.lineWidth = 2;
			context_in.strokeStyle = 'rgba(0,230,150,0.8)';
			context_in.beginPath();
			var offset = face_box_offset;
			context_in.rect(df[i].x - offset, df[i].y - offset, df[i].width + (offset*2), df[i].height + (offset*2));
			context_in.stroke();

		}
	}
}

// call the external detect face function
function detectFace(canvas_in) {
	// detect faces in the input canvas
	var detected_faces = ccv.detect_objects({
		"canvas" : ccv.grayscale(canvas_in),
		"cascade" : cascade,
		"interval" : 5,
		"min_neighbors" : 1
	});
	return detected_faces; // array of all the detected faces in image
}

// calculates the Black and White image
function calculate_bw() {
	// update threshold values based on slider
	var new_thresh = document.getElementById("threshold").value;
	r_threshold = new_thresh;
	g_threshold = new_thresh;
	b_threshold = new_thresh;

	var current_face_width = current_face_canvas.width;
	var current_face_height = current_face_canvas.height;
	var frame = current_face_canvas.getContext('2d').getImageData(0, 0, current_face_width, current_face_height);
	// modify the frame: make black and white
	var l = frame.data.length / 4;
    for (i = 0; i < l; i++) {
		r = frame.data[i * 4 + 0];
		g = frame.data[i * 4 + 1];
		b = frame.data[i * 4 + 2];
		if (r > r_threshold && g > g_threshold && b > b_threshold) { 
			frame.data[i * 4 + 0] = 255;
			frame.data[i * 4 + 1] = 255;
			frame.data[i * 4 + 2] = 255;
		} else {
			frame.data[i * 4 + 0] = 0;
			frame.data[i * 4 + 1] = 0;
			frame.data[i * 4 + 2] = 0;
		}
    }
    black_and_white_canvas.getContext('2d').putImageData(frame, 0, 0);
}

// transfers data from the "black and white" thresholded image
// into the location of the "saved" face (for exporting)
function save_face() {
	var source = black_and_white_canvas;
	var source_width = black_and_white_canvas.width;
	var source_height = black_and_white_canvas.height;
	var destination = saved_face_canvas;
	destination.getContext('2d').putImageData(source.getContext('2d').getImageData(0, 0, source_width, source_height), 0, 0);
	
	var pixel_list = "(";
	var num_pixels_found = 0;
	
	var frame = saved_face_canvas.getContext('2d').getImageData(0, 0, saved_face_canvas.width, saved_face_canvas.height);
	var num_pixels = frame.data.length / 4;
	var image_width = saved_face_canvas.width;
	// go through each pixel
	for (i=0; i<num_pixels; i++) {
		if (frame.data[i*4 + 0] == 0 && frame.data[i*4 + 1] == 0 && frame.data[i*4 + 2] == 0) {
			// black pixel
			var row = ~~(i / image_width); // quotient
			var column = i % image_width; // remainder
			if (num_pixels_found > 0) {
				pixel_list += ", ";
			}
			pixel_list += "(" + row + "," + column + ")";
			num_pixels_found++;
		}
	}
	
	pixel_list = pixel_list + ")";

	// generate the exporting Python Code
	var orig = document.getElementById("pixel_list_orig").innerHTML;
	orig = orig.replace("REPLACE_WITH_PIXEL_ARRAY", pixel_list);
	orig = orig.replace("NUM_PIXELS", num_pixels_found);
	document.getElementById("pixel_list").innerHTML = orig;
}

// function that is called iteratively
// to identify the face in the video
// and generate the small (scaled) version
function track_faces() {
	var size_width = face_detection_canvas.getAttribute("width");
	var size_height = face_detection_canvas.getAttribute("height");
	
	// draw current video to canvas
	face_detection_canvas.getContext('2d').drawImage(video, 0, 0, size_width, size_height);
	// detect faces on this frame
    var faces = detectFace(face_detection_canvas);
    // report number of faces detected
	document.getElementById("num-faces").innerHTML = faces.length.toString();
    
    // output face size (update this in case textbox has changed)
    face_width = parseInt(document.getElementById("output_resolution").value);
    face_height = face_width; // match (to make square)
    // update debugging text
    var image_size_text;
	image_size_text = face_width.toString() + " x " + face_height.toString();
	try {
		document.getElementById("face_image_dim").innerHTML = image_size_text;
	} catch (err) {
		console.log("Didn't find face_image_dim element: " + image_size_text + " (err: " + err + ")");
	}
	
	// if found faces:
	if (faces.length > 0) {
		// set ouput canvas
		var offset = face_box_offset;
		
		// get data (of first detected face) before drawing boxes
		var face_context = face_detection_canvas.getContext('2d');
		var face_data = face_context.getImageData(
			faces[0].x - offset, faces[0].y - offset,
			faces[0].width + (offset*2), faces[0].height + (offset*2)
		);
		
		// draw face indicators on canvas
		drawFaceBox(face_detection_canvas, faces);
		
		// calculate scale
		var scale_width = face_width / (faces[0].width + (offset*2));
		var scale_height = face_height / (faces[0].height + (offset*2));

		// clear and get rid of old data
		tmp_face_canvas.getContext('2d').clearRect(0, 0, tmp_face_canvas.width, tmp_face_canvas.height);
		current_face_canvas.getContext('2d').clearRect(0, 0, current_face_canvas.width, current_face_canvas.height);
		// place face data in temp spot
		tmp_face_canvas.getContext('2d').putImageData(face_data,0,0,0,0,faces[0].width + (offset*2),faces[0].height + (offset*2));
		// set scale of output canvas
		current_face_canvas.getContext('2d').scale(scale_width, scale_height);
		// redraw tmp data into scaled canvas
		current_face_canvas.getContext('2d').drawImage(tmp_face_canvas,0,0);
		// set scale back to "1" (inverse of previous scale)
		current_face_canvas.getContext('2d').scale(1/scale_width, 1/scale_width);				

		calculate_bw();

	    // save face? (first time, do a save ... after this will be done by button)
	    if (save_face_boolean == false) {
		    save_face();
			save_face_boolean = true;
		}

	}
	// call it again
	setTimeout(track_faces, detect_face_timeout);
}

// called once on body/document load, to set up everything proper
function face_detection_setup() {
	var image_size_text = "";

	// configure global canvas elements
	video_canvas = document.getElementById('video');
	face_detection_canvas = document.getElementById('face_detection');
	current_face_canvas = document.getElementById('current_face');
	black_and_white_canvas = document.getElementById('black_and_white');
	saved_face_canvas = document.getElementById('saved_face');
	tmp_face_canvas = document.getElementById('tmp_face');

	// Grab elements, create settings, etc.
	video_canvas.setAttribute("width", input_width);
	video_canvas.setAttribute("height", input_height);
	image_size_text = input_width.toString() + " x " + input_height.toString();
	try {
		document.getElementById("input_image_dim").innerHTML = image_size_text;
	} catch (err) {
		console.log("Didn't find input_image_dim element: " + image_size_text + " (err: " + err + ")");
	}
	
	// Get access to the camera!
	if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
	    // Not adding `{ audio: true }` since we only want video now
	    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
	        //video.src = window.URL.createObjectURL(stream);
	        video_canvas.srcObject = stream;
	        video_canvas.play();
	    });
	}

	// Elements for taking the snapshot
	face_detection_canvas.setAttribute("width", output_width);
	face_detection_canvas.setAttribute("height", output_height);

	image_size_text = output_width.toString() + " x " + output_height.toString();
	try {
		document.getElementById("output_image_dim").innerHTML = image_size_text;
	} catch (err) {
		console.log("Didn't find output_image_dim element: " + image_size_text + " (err: " + err + ")");
	}
	
	// current face
	current_face_canvas.setAttribute("width", face_width);
	current_face_canvas.setAttribute("height", face_height);
	// black and white version
	black_and_white_canvas.setAttribute("width", face_width);
	black_and_white_canvas.setAttribute("height", face_height);
	// saved version
	saved_face_canvas.setAttribute("width", face_width);
	saved_face_canvas.setAttribute("height", face_height);
	// tmp version
	tmp_face_canvas.setAttribute("width", input_width);
	tmp_face_canvas.setAttribute("height", input_height);
	
	// face image size:
	image_size_text = face_width.toString() + " x " + face_height.toString();
	try {
		document.getElementById("face_image_dim").innerHTML = image_size_text;
	} catch (err) {
		console.log("Didn't find face_image_dim element: " + image_size_text + " (err: " + err + ")");
	}

	// Trigger photo take
	document.getElementById("track").addEventListener("click", function() { track_faces(); });
	// Trigger saving current face
	document.getElementById("save").addEventListener("click", function() { save_face(); });
	// Change color-to-BW threshold value
	document.getElementById("threshold").addEventListener("input", function() { calculate_bw(); });
}
