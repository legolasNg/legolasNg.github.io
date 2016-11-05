$(document).ready(function() {
     $('#toc').toc({
       noBackToTopLinks: false,
       minimumHeaders: 2,
       headers: 'h2, h3',
       listType: 'ul', // values: [ol|ul]
       showEffect: 'show', // values: [show|slideDown|fadeIn|none]
       showSpeed: 0, // set to 0 to deactivate effect
       title: '',
       classes: {
         list: 'clickable-header',
         item: 'clickable-header:hover'
       },
     });
 });

!function ($) {
  $(function () {
    $(window).load(repairTheImagesWhichCrossTheMaxWidth);
    function repairTheImagesWhichCrossTheMaxWidth(){
      var images = $(".docs-content img");
      if(images != undefined && images.length > 0){
        for(var i=0; i< images.length;i++){
          var imgWidth = images[i].width;
          if( imgWidth >= 757 ){
             images[i].width = 757;
          }
        }
      }
    }
  })
}(jQuery)
