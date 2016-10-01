/*!
 * Adapted from Bootstrap docs JavaScript
 */
 //toc.js实现
 $(document).ready(function() {
     $('#toc').toc({
       listType: 'ul',
       title: '',
       noBackToTopLinks: true,
       minimumHeaders: 2,
       showEffect: 'slideDown',
       classes: {
         list: 'lorem ipsum',
         item: 'dolor sit amet'
       },
       showSpeed: 0
     });
     $("#markdown-toc").remove();
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
