var DialogManager = function() {
  this.dialogShown = false;
  this.mouseLastX = 0;
  this.mouseLastY = 0;

  this.dialogMove = false;
  this.dialogResize = false;
}

DialogManager.prototype = {
  init: function() {
    var dialogManager = this;

    $('.dialog .title').on('mouseup', function(e) {
      dialogManager.dialogMove = false;
    });


    $('.dialog .title').on('mousedown', function(e) {

      var dialog = $(this).closest('.dialog');

      dialog.mouseDownX = dialogManager.mouseLastX;
      dialog.mouseDownY = dialogManager.mouseLastY;

      var dialogOffset = dialog.offset();
      var width = dialog.width();
      dialog.mouseDownOffsetX =  dialogOffset.left - dialogManager.mouseLastX;
      dialog.mouseDownOffsetY = dialogOffset.top - dialogManager.mouseLastY ;

      dialogManager.dialogMove = dialog;

    });


    var resizeSize = 4;

    var resizeHTML = '<div class="dialogResize dialogNorthresize" style=" position: absolute; top: 0; left: ' + resizeSize+ 'px; right: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: n-resize"></div>';

    resizeHTML += '<div class="dialogResize dialogNortheastresize" style="position: absolute; top: 0; right: 0; width: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: ne-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogEastresize" style=" position: absolute; top: ' + resizeSize + 'px; bottom: ' + resizeSize + 'px; right: 0px; width: ' + resizeSize + 'px; cursor: e-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogSoutheastresize" style="position: absolute; bottom: 0; right: 0; width: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: se-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogSouthresize" style="position: absolute; bottom: 0; left: ' + resizeSize + 'px; right: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: s-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogSouthwestresize"  style="position: absolute; bottom: 0; left: 0; width: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: sw-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogWestresize" style="position: absolute; top: ' + resizeSize + 'px; bottom: ' + resizeSize + 'px; left: 0px; width: ' + resizeSize + 'px; cursor: w-resize"></div>';
    resizeHTML += '<div class="dialogResize dialogNorthwestresize" style=" position: absolute; top: 0; left: 0; width: ' + resizeSize + 'px; height: ' + resizeSize + 'px; cursor: nw-resize"></div>';

    $('.dialog').append(resizeHTML);

    $('.dialogResize').on('mousedown', function() {
      console.log('dialog resize');
      var cssClass = $(this).attr('class');

      var dialog = $(this).closest('.dialog');      
      dialog.mouseDownX = dialogManager.mouseLastX;
      dialog.mouseDownY = dialogManager.mouseLastY;

      var dialogOffset = dialog.offset();
      dialog.originalWidth = dialog.width();
      dialog.originalHeight = dialog.height();

      dialog.originalLeft = dialogOffset.left;
      dialog.originalTop = dialogOffset.top;

      if(cssClass.indexOf('dialogNorthresize') != -1) {
        dialogManager.dialogResizeType = 'north';
      } else if(cssClass.indexOf('dialogNortheastresize') != -1) {
        dialogManager.dialogResizeType = 'northeast';
      } else if(cssClass.indexOf('dialogNorthwestresize') != -1) {
        dialogManager.dialogResizeType = 'northwest';
      } else if(cssClass.indexOf('dialogSouthresize') != -1) {
        dialogManager.dialogResizeType = 'south';
      } else if(cssClass.indexOf('dialogSoutheastresize') != -1) {
        dialogManager.dialogResizeType = 'southeast';
      } else if(cssClass.indexOf('dialogSouthwestresize') != -1) {
        dialogManager.dialogResizeType = 'southwest';
      } else if(cssClass.indexOf('dialogWestresize') != -1) {
        dialogManager.dialogResizeType = 'west';
      } else if(cssClass.indexOf('dialogEastresize') != -1) {
        dialogManager.dialogResizeType = 'east';
      }

    
      dialogManager.dialogResize = dialog;

    });

    $('.dialog .title').each(function(index) {
      var titleText = $(this).text();
      var innerHTML = '<div style="position: absolute; top: 6px; left: 6px; right: 30px; overflow: hidden; white-space: nowrap">' + titleText + '</div>';
      innerHTML += '<div style="position: absolute; top: 2px; right: 2px; width: 20px" ><button class="dialogCloseButton">x</button></div>';
      $(this).html(innerHTML);
    });
//    var closeHTML = 
//    closeHTML += '</div>';

//    $('.dialog .title').append(closeHTML);

    $('.dialogCloseButton').on('click', function() {
      dialogManager.hideDialog();
    });

  },

  mouseDown: function(event) {

  },

  mouseMove: function(event) {
    var deltaX = event.clientX - this.mouseLastX;
    var deltaY = event.clientY - this.mouseLastY;

    this.mouseLastX = event.clientX;
    this.mouseLastY = event.clientY;

    if(this.dialogMove) {
      var dragX = this.mouseLastX + this.dialogMove.mouseDownOffsetX;
      var dragY = this.mouseLastY + this.dialogMove.mouseDownOffsetY;

      this.dialogMove.css('left', dragX + 'px');
      this.dialogMove.css('top', dragY + 'px');
    }

    if(this.dialogResize) {
      var xdiff = this.mouseLastX - this.dialogResize.mouseDownX;
      var ydiff = this.mouseLastY - this.dialogResize.mouseDownY;     

      console.log(this.dialogResizeType);

      var width = this.dialogResize.originalWidth;// + xdiff;
      var height = this.dialogResize.originalHeight;// + ydiff; 
      var offset = this.dialogResize.offset();
      var left = this.dialogResize.originalLeft;
      var top = this.dialogResize.originalTop;


      if(this.dialogResizeType == 'east' || this.dialogResizeType == 'northeast' || this.dialogResizeType == 'southeast') {
        width += xdiff;
      }

      if(this.dialogResizeType == 'west' || this.dialogResizeType == 'northwest' || this.dialogResizeType == 'southwest') {
        left += xdiff;
        this.dialogResize.css('left', left + 'px');
        width -= xdiff;
      }

      if(this.dialogResizeType == 'north' || this.dialogResizeType == 'northeast' || this.dialogResizeType == 'northwest') {
        top += ydiff;
        this.dialogResize.css('top', top + 'px');
        height -= ydiff;
      }

      if(this.dialogResizeType == 'south' || this.dialogResizeType == 'southwest' || this.dialogResizeType == 'southeast') {
        height += ydiff;
      }


      this.dialogResize.css('width', width);
      this.dialogResize.css('height', height);
    }
  },

  mouseUp: function(event) {
    this.dialogMove = false;
    this.dialogResize = false;

  },


  showDialog: function(dialogID) {
    this.dialogShown = dialogID;
    $('#dialogBackground').show();
    $('#' + dialogID).show();


    var titleHeight = $('#' + dialogID + ' .title').height();
    var buttonsHeight = $('#' + dialogID + ' .buttons').height();

    var height = $('#'+ dialogID).height();

    var scrollHeight = $('#' + dialogID + ' .content')[0].scrollHeight;

    height = scrollHeight + titleHeight + buttonsHeight;

    if(height > window.innerHeight - 40) {      
      height = window.innerHeight - 40;
    }


    $('#' + dialogID).height(height);

    var width = $('#' + dialogID).width();
    var offset = (window.innerWidth - width ) / 2;
    $('#' + dialogID).css('left', offset + 'px');


  },

  hideDialog: function(dialogID) {
    if(typeof dialogID == 'undefined') {
      dialogID = this.dialogShown;
    }
    $('#dialogBackground').hide();
    $('#' + dialogID).hide();
    this.dialogShown = '';

  },


}