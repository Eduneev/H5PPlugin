/* eslint-disable require-jsdoc */
/* global H5PEmbedCommunicator:true */
/**
 * When embedded the communicator helps talk to the parent page.
 * This is a copy of the H5P.communicator, which we need to communicate in this context
 *
 * @type {H5PEmbedCommunicator}
 */
H5PEmbedCommunicator = (function() {
    /**
     * @class
     * @private
     */
    function Communicator() {
        var self = this;

        // Maps actions to functions.
        var actionHandlers = {};

        // Register message listener.
        window.addEventListener('message', function receiveMessage(event) {
            if (window.parent !== event.source || event.data.context !== 'h5p') {
                return; // Only handle messages from parent and in the correct context.
            }

            if (actionHandlers[event.data.action] !== undefined) {
                actionHandlers[event.data.action](event.data);
            }
        }, false);

        /**
         * Register action listener.
         *
         * @param {string} action What you are waiting for
         * @param {function} handler What you want done
         */
        self.on = function(action, handler) {
            actionHandlers[action] = handler;
        };

        /**
         * Send a message to the all mighty father.
         *
         * @param {string} action
         * @param {Object} [data] payload
         */
        self.send = function(action, data) {
            if (data === undefined) {
                data = {};
            }
            data.context = 'h5p';
            data.action = action;

            // Parent origin can be anything.
            window.parent.postMessage(data, '*');
        };
    }

    return (window.postMessage && window.addEventListener ? new Communicator() : undefined);
})();

var starttime;
var stoptime;
var timespent=0;
var endtime;
var available_time = 0;
var videoTimeout;
var courseid;
var userid;
var cm;
var cm_name;

document.onreadystatechange = function() {
    // Wait for instances to be initialize.
    if (document.readyState !== 'complete') {
        return;
    }

    // eslint-disable-next-line no-console
    console.log("Logging inside embed");

    // Check for H5P iFrame.
    var iFrame = document.querySelector('.h5p-iframe');
    if (!iFrame || !iFrame.contentWindow) {
        return;
    }
    var H5P = iFrame.contentWindow.H5P;

    // Check for H5P instances.
    if (!H5P || !H5P.instances || !H5P.instances[0]) {
        return;
    }

    var resizeDelay;
    var instance = H5P.instances[0];
    var parentIsFriendly = false;

    postLoading(instance, H5P);

    // Handle that the resizer is loaded after the iframe.
    H5PEmbedCommunicator.on('ready', function() {
        H5PEmbedCommunicator.send('hello');
    });

    // Handle hello message from our parent window.
    H5PEmbedCommunicator.on('hello', function(e) {

      courseid = e['courseid'];
      cm = e['cm'];
      cm_name = e['cm_name'];
      userid = e['userid'];

      console.log("Loaded all instances: " + courseid + cm + cm_name + userid);
      

        // Initial setup/handshake is done.
        parentIsFriendly = true;

        // Hide scrollbars for correct size.
        iFrame.contentDocument.body.style.overflow = 'hidden';

        document.body.classList.add('h5p-resizing');

        // Content need to be resized to fit the new iframe size.
        H5P.trigger(instance, 'resize');
    });

    // When resize has been prepared tell parent window to resize.
    H5PEmbedCommunicator.on('resizePrepared', function() {
        H5PEmbedCommunicator.send('resize', {
            /** CODE EDITED BY SANAT SHARMA */
            scrollHeight: getIframeBodyHeights(iFrame).scrollHeight
            // eslint-disable-next-line capitalized-comments
            // scrollHeight: iFrame.contentDocument.body.scrollHeight
        });
    });

    H5PEmbedCommunicator.on('resize', function() {
        H5P.trigger(instance, 'resize');
    });

    H5P.on(instance, 'resize', function() {
        if (H5P.isFullscreen) {
            return; // Skip iframe resize.
        }

        // Use a delay to make sure iframe is resized to the correct size.
        clearTimeout(resizeDelay);
        resizeDelay = setTimeout(function() {
            // Only resize if the iframe can be resized.
            if (parentIsFriendly) {
                // CODE ADDED BY SANAT SHARMA
                var heights = getIframeBodyHeights(iFrame);
                H5PEmbedCommunicator.send('prepareResize',
                    {
                        scrollHeight: heights.scrollHeight,
                        clientHeight: heights.clientHeight
                        // scrollHeight: iFrame.contentDocument.body.scrollHeight,
                        // clientHeight: iFrame.contentDocument.body.clientHeight
                    }
                );
                // Code change end
            } else {
                H5PEmbedCommunicator.send('hello');
            }
        }, 0);
    });

    window.onbeforeunload = function () {
        if (starttime) {
        stoptime = new Date().getTime();
        return addTime();
      }
    };

    window.addEventListener("beforeunload", function (e) {
        // var confirmationMessage = "\o/";
        console.log(starttime)
        if (starttime && starttime > 0) {
        stoptime = new Date().getTime();
        return addTime();
      }
    });

    // Trigger initial resize for instance.
    H5P.trigger(instance, 'resize');
};

function getIframeBodyHeights(iFrame) {
    var margin = parseInt(getComputedStyle(document.body)['margin'], 10) || 0;

    return {
        scrollHeight: iFrame.contentDocument.body.scrollHeight + margin * 2,
        clientHeight: iFrame.contentDocument.body.clientHeight + margin * 2,
    };
}

function postLoading(instance, iframeH5P) {
    var vid = instance.video;
    vid.on('stateChange', function (event) {
    switch (event.data) {
        case iframeH5P.Video.ENDED:
        endtime = new Date().getTime();
        console.log('ended => '+ endtime);
        addTime();
        if(videoTimeout) clearTimeout(videoTimeout);	
        break;
    
        case iframeH5P.Video.PLAYING:
        // Do not change start time if caused due to buffering
                    if (!starttime || starttime == 0) 
        starttime = new Date().getTime();
        else 
        console.log("Not setting new starttime.");

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
    
    if (endtime && starttime != 0) {
      timespent = Math.abs( ( parseInt(endtime) - parseInt(starttime) ) / 1000 );
      starttime = 0;
    }
    else if ( starttime < stoptime  && starttime != 0) {
      timespent = timespent + Math.abs( ( parseInt(stoptime) - parseInt(starttime) ) / 1000 );
      starttime = 0;			
    }		
    
    // TODO Call servuce function local_vpt_addUserTime_mobile
    sendTime(type);
  
  }
  
  function sendTime(type='') {
  
    console.log("inside SENDTIME");
          
    var data = {
      wstoken: 'b81f5e684fbf38b8af50ff0bf226f714',
      wsfunction: 'local_vpt_addUserTime_mobile',      
      courseid: courseid,
      userid: userid,
      timespent: Math.ceil(timespent),
      cm: cm,
      cm_name: cm_name
    }
    
    var url = 'https://go.2learn.in/webservice/rest/server.php?' + 
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
  