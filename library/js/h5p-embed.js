// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

define(['jquery', 'mod_hvp/communicator'], function($, H5PEmbedCommunicator) {
    
  var starttime
var stoptime;
var timespent=0;
var endtime;
var available_time = 0;
  var videoTimeout;

  // Wait for instances to be initialize.
  $(document).ready(function() {
      $('.h5p-iframe').ready(function() {
          var iFrame = document.querySelector('.h5p-iframe');
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
          H5PEmbedCommunicator.on('hello', function() {

              console.log("Inside inner iframe?");
              // Initial setup/handshake is done.
              parentIsFriendly = true;

              // Hide scrollbars for correct size.
              iFrame.contentDocument.body.style.overflow = 'hidden';

              document.body.classList.add('h5p-resizing');

              // Content need to be resized to fit the new iframe size.
              H5P.trigger(instance, 'resize');

              H5P.trigger(instance, 'initialize');
          });

          // When resize has been prepared tell parent window to resize.
          H5PEmbedCommunicator.on('resizePrepared', function() {
              H5PEmbedCommunicator.send('resize', {
                  scrollHeight: iFrame.contentDocument.body.scrollHeight
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
                      H5PEmbedCommunicator.send('prepareResize',
                          {
                              scrollHeight: iFrame.contentDocument.body.scrollHeight,
                              clientHeight: iFrame.contentDocument.body.clientHeight
                          }
                      );
                  } else {
                      H5PEmbedCommunicator.send('hello');
                  }
              }, 0);
          });

          H5P.on(instance, 'initialize', function() {
              WaitForIframeLoading(iFrame);
          });

          // Trigger initial resize for instance.
          H5P.trigger(instance, 'resize');
      });
  });

  function WaitForIframeLoading(iframe) {
      //var iframe = document.getElementsByTagName('iframe')[0].contentWindow.document.getElementsByTagName('iframe')[0];
      var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      console.log("waiting for loading")
      // Check if loading is complete
      if (  iframeDoc.readyState  == 'complete' ) {
  
          //iframe.setAttribute('allowFullScreen', '');
          //iframe.contentWindow.alert("Hello");
          /*
          iframe.contentWindow.onload = function(){
              alert("I am loaded");
          };
          */
          console.log("inner iframe loaded");
          // The loading is complete, call the function we want executed once the iframe is loaded
          //var iframeH5P = iframe.contentWindow.H5P;
          //postLoading(H5P);

          // call function here
          return;
      }

      window.setTimeout(WaitForIframeLoading, 100);
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
  
  window.onbeforeunload = function () {
    if (starttime) {
    stoptime = new Date().getTime();
    return addTime();
  }
}

window.addEventListener("beforeunload", function (e) {
    // var confirmationMessage = "\o/";
    console.log(starttime)
    if (starttime && starttime > 0) {
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

  var courseid = parseInt(document.getElementById("extra-data").getAttribute('courseid'));
  var userid = parseInt(document.getElementById("extra-data").getAttribute('userid'));
  var cm = parseInt(document.getElementById("extra-data").getAttribute('cm'));
  var cm_name = document.getElementById("extra-data").getAttribute('cm_name');
      
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

});
