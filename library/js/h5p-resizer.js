// H5P iframe Resizer
(function () {
  if (!window.postMessage || !window.addEventListener || window.h5pResizerInitialized) {
    return; // Not supported
  }
  window.h5pResizerInitialized = true;

  console.log("ANY AT ALL LOGGING");

  // Map actions to handlers
  var actionHandlers = {};

  /**
   * Prepare iframe resize.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Object} data Payload
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.hello = function (iframe, data, respond) {

    // Make iframe responsive
    iframe.style.width = '100%';

    // Bugfix for Chrome: Force update of iframe width. If this is not done the
    // document size may not be updated before the content resizes.
    iframe.getBoundingClientRect();

    // Tell iframe that it needs to resize when our window resizes
    var resize = function () {
      if (iframe.contentWindow) {
        // Limit resize calls to avoid flickering
        respond('resize');
      }
      else {
        // Frame is gone, unregister.
        window.removeEventListener('resize', resize);
      }
    };
    window.addEventListener('resize', resize, false);

    // Respond to let the iframe know we can resize it
    respond('hello');
  };

  /**
   * Prepare iframe resize.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Object} data Payload
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.prepareResize = function (iframe, data, respond) {
    // Do not resize unless page and scrolling differs
    if (iframe.clientHeight !== data.scrollHeight ||
        data.scrollHeight !== data.clientHeight) {

      // Reset iframe height, in case content has shrinked.
      iframe.style.height = data.clientHeight + 'px';
      respond('resizePrepared');
    }
  };

  /**
   * Resize parent and iframe to desired height.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Object} data Payload
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.resize = function (iframe, data) {
    // Resize iframe so all content is visible. Use scrollHeight to make sure we get everything
    iframe.style.height = data.scrollHeight + 'px';
  };

  actionHandlers.initialized = function (iframe, data) {
    var outerFrame = iframe.contentWindow.document.getElementsByTagName('iframe')[0];
    
    WaitForIframeLoading(outerFrame);
  }

  function WaitForIframeLoading(iframe) {
    var iframe = document.getElementsByTagName('iframe')[0].contentWindow.document.getElementsByTagName('iframe')[0];
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Check if loading is complete
    if (  iframeDoc.readyState  == 'complete' ) {

        //iframe.setAttribute('allowFullScreen', '');
        //iframe.contentWindow.alert("Hello");
        /*
        iframe.contentWindow.onload = function(){
            alert("I am loaded");
        };
        */
        // The loading is complete, call the function we want executed once the iframe is loaded
        var iframeH5P = iframe.contentWindow.H5P;

        postLoading(iframeH5P);

        // call function here
        return;
    } 

    // If we are here, it is not loaded. Set things up so we check   the status again in 100 milliseconds
    window.setTimeout(WaitForIframeLoading, 100);
  }

  function postLoading(iframeH5P) {
    for (var instance of iframeH5P.instances){
      var vid = instance.video;
      vid.on('stateChange', function (event) {
        switch (event.data) {
          case iframeH5P.Video.ENDED:
          endtime = new Date().getTime();
          console.log('ended => '+ endtime);
          //addTime();
          if(videoTimeout) clearTimeout(videoTimeout);	
          break;
        
          case iframeH5P.Video.PLAYING:
          starttime = new Date().getTime();
          console.log('play => '+ starttime);
          if (available_time > 0) {
            if(videoTimeout) clearTimeout(videoTimeout);
            setVideoTimeout(available_time);
          }
          break;
        
          case iframeH5P.Video.PAUSED:
          stoptime = new Date().getTime();
          console.log('pause => '+ stoptime);
          addTime();
          if(videoTimeout) clearTimeout(videoTimeout);
          break;		   
        }
      });
    }    
  }

  /**
   * Keyup event handler. Exits full screen on escape.
   *
   * @param {Event} event
   */
  var escape = function (event) {
    if (event.keyCode === 27) {
      exitFullScreen();
    }
  };

  // Listen for messages from iframes
  window.addEventListener('message', function receiveMessage(event) {
    if (event.data.context !== 'h5p') {
      return; // Only handle h5p requests.
    }

    // Find out who sent the message
    var iframe, iframes = document.getElementsByTagName('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframe = iframes[i];
        break;
      }
    }

    if (!iframe) {
      return; // Cannot find sender
    }

    // Find action handler handler
    if (actionHandlers[event.data.action]) {
      actionHandlers[event.data.action](iframe, event.data, function respond(action, data) {
        if (data === undefined) {
          data = {};
        }
        data.action = action;
        data.context = 'h5p';
        event.source.postMessage(data, event.origin);
      });
    }
  }, false);

  // Let h5p iframes know we're ready!
  var iframes = document.getElementsByTagName('iframe');
  var ready = {
    context: 'h5p',
    action: 'ready'
  };
  for (var i = 0; i < iframes.length; i++) {
    if (iframes[i].src.indexOf('h5p') !== -1) {
      iframes[i].contentWindow.postMessage(ready, '*');
    }
  }

  var starttime
	var stoptime;
	var timespent=0;
	var endtime;
	var available_time = 0;
  var videoTimeout;

	window.onbeforeunload = function () {
		if (starttime) {
			stoptime = new Date().getTime();
			return addTime();
		}

	}

	window.addEventListener("beforeunload", function (e) {
	  	// var confirmationMessage = "\o/";
	  	console.log(starttime)
	  	if (starttime) {
			stoptime = new Date().getTime();
			return addTime();
		}
	});

	function setVideoTimeout(time) {
		time = (time) ? time * 1000 : 0;
		if (time > 0 ) {
			videoTimeout = setTimeout(function() {	
				stoptime = new Date().getTime();			
				//console.log(time);
				addTime('refresh');
				// window.location.reload();
			}, time);
		}
	}

	function addTime(type='') {
    console.log("INSIDE ADDTIME");
    var now = new Date().getTime();    
    stoptime = (stoptime != '' ) ? stoptime : now;
    /*
    if (endtime) {
			timespent = Math.abs( ( parseInt(endtime) - parseInt(starttime) ) / 1000 );
    }
    */
		if ( starttime < stoptime) {
			timespent = timespent + Math.abs( ( parseInt(stoptime) - parseInt(starttime) ) / 1000 );
			starttime = 0;			
		}		
		
		// TODO Call servuce function local_vpt_addUserTime_mobile
		sendTime(type);

	}

	function sendTime(type='') {

    console.log("inside SENDTIME");

    var courseid = parseInt(document.getElementById("extra-data").getAttribute('courseid'));
    var userid = parseInt(document.getElementById("extra-data").getAttribute('userid'));
    var cm = parseInt(document.getElementById("extra-data").getAttribute('cm'));
    var cm_name = parseInt(document.getElementById("extra-data").getAttribute('cm_name'));
    		
		var data = {
			wstoken: 'b81f5e684fbf38b8af50ff0bf226f714',
      wsfunction: 'local_vpt_addUserTime_mobile',      
			courseid: courseid,
			userid: userid,
      timespent: Math.ceil(timespent),
      cm: cm,
      cm_name: cm_name
		}
		
		var url = 'https://enlp.in/webservice/rest/server.php?' + 
				'wstoken=' + data.wstoken + '&' +
        'wsfunction=' + data.wsfunction + '&' + 
        'moodlewsrestformat=json' + '&' +
				'courseid=' + data.courseid + '&' + 
				'userid=' + data.userid + '&' + 
        'timespent=' + data.timespent + '&' +
        'cm=' + data.cm + '&' + 
        'cm_name=' + data.cm_name;
		
		timespent= 0;

		var xhttp = new XMLHttpRequest();

		xhttp.open('POST', url, true);
		xhttp.send();

		xhttp.onreadystatechange=function() {
			if (this.readyState == 4 && this.status == 200) {
				var response = this.response;
				try {
          var record = JSON.parse(response);
          console.log(record);
					if (typeof record.available_time != 'undefined' && record.available_time > 0) {
						available_time = record.available_time;
            clearTimeout(videoTimeout);
            timespent=0;
					}
					else {
            if (typeof record.available_time == 'undefined')
              alert("Error Occurred, please contact admin");
            else {
              alert("Your Available Play Time for this course has completed. Please purchase more to continue");
            }
            location.reload();
					}

				}
				catch{
					console.log ("Some other erro occured");
				}
			}
			else {
				// some error happened
				console.log("Errors occured in trying to add time.")
			}
    };    

	}

})();
