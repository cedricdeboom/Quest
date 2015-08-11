$(function() {
    $('#form').submit(function() {
        var hash = CryptoJS.SHA256($('#password').val());
        $('#password').val(hash);
    });
});