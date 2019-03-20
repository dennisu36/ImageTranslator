var validTypes = ['jpg', 'jpeg', 'png', 'pdf'];
function readURL(input) {
  if (input.files && input.files[0]) {
    var extension = input.files[0].name.split('.').pop().toLowerCase(),
     isSuccess = validTypes.indexOf(extension) > -1;
      if (isSuccess) {
            var reader = new FileReader();
            reader.onload = function (e) {
            }
if(extension == 'pdf'){
                alert('You have inserted a pdf.')
            }
            else if (extension == 'jpg', 'png', 'jpeg'){
                alert('You have inserted an image.')
            }
          reader.onload = function(e) {
      $('.image-upload-wrap').hide();

      $('.file-upload-image').attr('src', e.target.result);
      $('.file-upload-content').show();

      $('.image-title').html(input.files[0].name);
    }
       reader.readAsDataURL(input.files[0]);
      }
      else{
          alert('Invalid File Type. Please insert JPG, JPEG, PNG, or PDF files.')
          removeUpload();
      }
  }
}



function removeUpload() {
  $('.file-upload-input').replaceWith($('.file-upload-input').clone());
  $('.file-upload-content').hide();
  $('.image-upload-wrap').show();
}
$('.image-upload-wrap').bind('dragover', function () {
                $('.image-upload-wrap').addClass('image-dropping');
        });
        $('.image-upload-wrap').bind('dragleave', function () {
                $('.image-upload-wrap').removeClass('image-dropping');
});
~                                                                                                                   
~                                                                                                                   
~                                                                                                                   
~        
