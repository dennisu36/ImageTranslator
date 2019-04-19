function initializeImageTranslateApp() {
    const image = document.getElementById('myImage');
    const canvas = new fabric.StaticCanvas('myCanvas');
    canvas.setHeight(600);
    canvas.setWidth(600);

    image.onload = function () {

        var fImage = new fabric.Image(image);
        fImage.scaleToHeight(canvas.getHeight());
        canvas.setWidth(fImage.getScaledWidth());
        canvas.add(fImage);

        //Start setting Tesseract options
        tessOptions = {
            tessedit_pageseg_mode: 1
        };

        //make Tesseract match with source language that is selected
        const srcLang = document.getElementById('language-src-select').value;
        if (srcLang == 'chinese') {
            tessOptions.lang = 'chi_sim';
        } else if (srcLang == 'french') {
            tessOptions.lang = 'fra';
        } else {
            tessOptions.lang = 'eng';
        }

        if (tessOptions.lang == 'eng' || tessOptions.lang == 'fra') {
            //This probably obviates the removeJunkText() function mostly, but I guess that can still
            //get rid of stray consonants that aren't part of words.
            tessOptions.tessedit_char_whitelist = "ABCDEFGHIJKLMNOPQRSTUVWYZabcdefghijklmnopqrstuvwxyz1234567890.?!"
        }

        console.log("loaded...", "$$$$");
        Tesseract.recognize(image, tessOptions)
                .progress((progress) => {
                    console.log(progress, "$$$$");
                    if (progress.hasOwnProperty('progress')) {
                        $('#progress').text(progress.status + ": " + (progress.progress * 100).toFixed(0) + " %");
                    } else {
                        $('#progress').text(progress.status);
                    }
                }).then((result) => {
            console.log(result, "$$$$");
            $('#result').text(removeJunkText(result.text));
            handleOCRResult(result);
        });
    }
    return {image: image, canvas: canvas};
}

var validTypes = ['jpg', 'jpeg', 'png', 'pdf'];
function readURL(input) {
    if (input.files && input.files[0]) {
        var extension = input.files[0].name.split('.').pop().toLowerCase(),
                isSuccess = validTypes.indexOf(extension) > -1;
        if (isSuccess) {
            var reader = new FileReader();
            if (extension == 'pdf') {
                alert("TODO convert the PDF to an image and load it into the image container.");
            } else if (extension == 'jpg', 'png', 'jpeg') {
                //alert('You have inserted an image.');
                //Nothing else to do here because the image .onload function initiates OCR
            }
            reader.onload = function (e) {
                $('.image-upload-wrap').hide();
                $('#myImage').attr('src', e.target.result);
                $('.file-upload-content').show();
                $('.image-title').html(input.files[0].name);
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            alert('Invalid File Type. Please insert JPG, JPEG, PNG, or PDF files.');
            removeUpload();
        }
    }
}

function removeUpload() {
    $('.file-upload-input').replaceWith($('.file-upload-input').clone());
    $('.file-upload-content').hide();
    $('.image-upload-wrap').show();
    imageTranslateApp.canvas.remove(...imageTranslateApp.canvas.getObjects());
    console.log("Removed image");
}

$('.image-upload-wrap').bind('dragover', function () {
    $('.image-upload-wrap').addClass('image-dropping');
});

$('.image-upload-wrap').bind('dragleave', function () {
    $('.image-upload-wrap').removeClass('image-dropping');
});

//Pass the OCR result here and process the detected segments appropriately.
function handleOCRResult(result) {
    const destLang = document.getElementById('language-dest-select').value;
    const srcLang = document.getElementById('language-src-select').value;

    console.log('Destination langauge: ' + destLang);
    console.log('Source language: ' + srcLang);

    const boundingBoxes = {}; // Object containing bounding boxes, indexed by line ID.

    // Array.prototype.map function, return new array from lines array to be sent via Ajax.
    const json = result.lines.map((line, index) => {
        boundingBoxes[index] = line.bbox;

        const obj = {};
        obj.id = index;
        obj.text = removeJunkText(line.text);
        obj.source_language = srcLang;
        obj.destination_language = destLang;
        return obj;
    });

    console.log(boundingBoxes);
    console.log(json);
    jsonRequestData = {translate: json}; //Need top-level translate key

    translateReq(jsonRequestData)
            .then(translatedText => {
                console.log(translatedText);
                handleServerResponse(translatedText, boundingBoxes);
            })
            .catch(error => {
                console.error(error);
            });
}

async function translateReq(textList) {
    /*
     @desc
     Performs an AJAX request to the /translate url using http POST method.
     
     @param object textList
     This is a javascript object that contains a list of objects containing text as well as meta data describing translating preferences. For example:
     const textList = [
     {
     id: 1,
     source_language: 'latin',
     destination_language: 'english',
     text: 'Bellum est malo'
     }
     ];
     
     @return
     A javascript object that contains a list of objects containing the translated text as well as meta data describing the translation. This data is received from the server over AJAX. For example:
     const textList = [
     {
     id: 1,
     source_language: 'latin',
     destination_language: 'english',
     translated_text: 'War is bad'
     }
     ];
     
     @throws Exception on unsuccessful network connection to the server.
     */

    const res = await fetch('/translate', {
        method: 'POST',
        body: JSON.stringify(textList),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json()).catch(error => {
        console.error(error);
    });
    return res;
}

async function handleServerResponse(textList, boundingBoxes) {
    var i;
    for (i = 0; i < textList.length; i++) {
        var text = textList[i];
        var bbox = boundingBoxes[text.id];
        console.log(text.translated_text);
        console.log(bbox);
        var width = bbox.x1 - bbox.x0;
        var height = bbox.y1 - bbox.y0;
        renderText(text.translated_text, bbox.x0, bbox.y0, width, height);
    }
}


function renderText(textInput, X, Y, textboxWidth, textboxHeight) {
    console.log(textInput + " at " + X + "," + Y + " width: " + textboxWidth + " height: " + textboxHeight);

    var fImage = imageTranslateApp.canvas.item(0);
    var scaleX = fImage.scaleX;
    var scaleY = fImage.scaleY;
    X *= scaleX;
    Y *= scaleY;
    textboxWidth *= scaleX;
    textboxHeight *= scaleY;

    //render a background rect in black
    var rect = new fabric.Rect({
        left: X,
        top: Y,
        width: textboxWidth,
        height: textboxHeight,
        fill: 'black'
    });

    // create text
    var text = new fabric.Text(textInput, {
        left: X,
        top: Y,
        width: textboxWidth,
        height: textboxHeight,
        fontFamily: 'Consolas',
        fill: 'white'
    });

    var fontSizeVertical = textboxHeight;
    var fontSizeHorizontal = textboxWidth / textInput.length / 0.55;
    text.fontSize = fontSizeVertical > fontSizeHorizontal ? fontSizeHorizontal : fontSizeVertical;

    imageTranslateApp.canvas.add(rect);
    imageTranslateApp.canvas.add(text);
}

function removeJunkText(inString) {
    /*
     @desc
     Removes stray/junk characters from the input string and returns the cleaned string.
     This does make some assumptions about the intended content of the original text, so might not
     be appropriate for all inputs.
     
     @param string inString
     A string to clean up.
     
     @return string
     */

    let punctuation = ",./;'[]-=`";
    let consonants = "qwrtyupsdfghjklzxcvbnm";
    punctuation = punctuation.split('');
    consonants = consonants.split('');
    punctuation.forEach(function (element) {
        inString = inString.replace(" " + element + " ", " ");
        inString = inString.replace(element + " ", " ");
        inString = inString.replace(" " + element.toUpperCase() + " ", " ");
        inString = inString.replace(element.toUpperCase() + " ", " ");
    });
    consonants.forEach(function (element) {
        inString = inString.replace(" " + element + " ", " ");
        inString = inString.replace(" " + element.toUpperCase() + " ", " ");
    });
    return inString;
}

console.log("\nInitializing spellchecker!\n");
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
var WORD_COUNTS;
ajaxCall().then(textVar => {
    //console.log(textVar)
    WORD_COUNTS = getWordCounts(textVar);
    console.log("\Finished initializing spellchecker!\n");
});
// console.log(WORD_COUNTS)

//var fs = require("fs");
//var corpus = String(fs.readFileSync('corpus'));
async function ajaxCall() {
    const corpus = await fetch('/corpus', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.text().then(t => t)).catch(error => {
        console.error(error);
    });
    return corpus;
}

/*
 Returns an object with each unique word in the input as a key,
 and the count of the number of occurances of that word as the value.
 (HINT: the code `text.toLowerCase().match(/[a-z]+/g)` will return an array
 of all lowercase words in the string.)
 */
function getWordCounts(text) {
    var wordsArray = text.toLowerCase().match(/[a-z]+/g);
    var resultObj = {};
    for (var i = 0; i < wordsArray.length; i++) {
        if (resultObj.hasOwnProperty(wordsArray[i])) {
            resultObj[wordsArray[i]]++;
        } else {
            resultObj[wordsArray[i]] = 1;
        }
    }
    return resultObj;
}

/*
 Returns the set of all strings 1 edit distance away from the input word.
 This consists of all strings that can be created by:
 - Adding any one character (from the alphabet) anywhere in the word.
 - Removing any one character from the word.
 - Transposing (switching) the order of any two adjacent characters in a word.
 - Substituting any character in the word with another character.
 */
function editDistance1(word) {
    word = word.toLowerCase().split('');
    var results = [];

    //Adding any one character (from the alphabet) anywhere in the word.
    for (var i = 0; i <= word.length; i++) {
        for (var j = 0; j < ALPHABET.length; j++) {
            var newWord = word.slice();
            newWord.splice(i, 0, ALPHABET[j]);
            results.push(newWord.join(''));
        }
    }

    //Removing any one character from the word.
    if (word.length > 1) {
        for (var i = 0; i < word.length; i++) {
            var newWord = word.slice();
            newWord.splice(i, 1);
            results.push(newWord.join(''));
        }
    }

    //Transposing (switching) the order of any two adjacent characters in a word.
    if (word.length > 1) {
        for (var i = 0; i < word.length - 1; i++) {
            var newWord = word.slice();
            var r = newWord.splice(i, 1);
            newWord.splice(i + 1, 0, r[0]);
            results.push(newWord.join(''));
        }
    }

    //Substituting any character in the word with another character.
    for (var i = 0; i < word.length; i++) {
        for (var j = 0; j < ALPHABET.length; j++) {
            var newWord = word.slice();
            newWord[i] = ALPHABET[j];
            results.push(newWord.join(''));
        }
    }
    return results;
}

/* Given a word, attempts to correct the spelling of that word.
 - First, if the word is a known word, return the word.
 - Second, if the word has any known words edit-distance 1 away, return the one with
 the highest frequency, as recorded in NWORDS.
 - Third, if the word has any known words edit-distance 2 away, return the one with
 the highest frequency, as recorded in NWORDS. (HINT: what does applying
 "editDistance1" *again* to each word of its own output do?)
 - Finally, if no good replacements are found, return the word.
 */
function correct(word) {
    function capitalize(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
    
    function preserveCapitalization(word) {
        return capital ? capitalize(word) : word;
    }

    var capital = word.toLowerCase() === word;
    word = word.toLowerCase();
    if (word in WORD_COUNTS) {
        return preserveCapitalization(word);
    }

    var maxCount = 0;
    var correctWord = word;
    var editDistance1Words = editDistance1(word);
    var editDistance2Words = [];

    for (var i = 0; i < editDistance1Words.length; i++) {
        editDistance2Words = editDistance2Words.concat(editDistance1(editDistance1Words[i]));
    }



    for (var i = 0; i < editDistance1Words.length; i++) {
        // console.log(editDistance1Words[i])
        if (editDistance1Words[i] in WORD_COUNTS) {
            // console.log(editDistance1Words[i], WORD_COUNTS[editDistance1Words[i]])
            if (WORD_COUNTS[editDistance1Words[i]] > maxCount) {
                maxCount = WORD_COUNTS[editDistance1Words[i]];
                correctWord = editDistance1Words[i];
            }
        }
    }
//console.log('========================================================================')
    var maxCount2 = 0;
    var correctWord2 = correctWord;

    for (var i = 0; i < editDistance2Words.length; i++) {
        if (editDistance2Words[i] in WORD_COUNTS) {
            // console.log(editDistance2Words[i], WORD_COUNTS[editDistance2Words[i]])
            if (WORD_COUNTS[editDistance2Words[i]] > maxCount2) {
                maxCount2 = WORD_COUNTS[editDistance2Words[i]];
                correctWord2 = editDistance2Words[i];
            }
        }
    }

    if (word.length < 6) {
        if (maxCount2 > 100 * maxCount) {
            return preserveCapitalization(correctWord2);
        }
        return preserveCapitalization(correctWord);
    } else {
        if (maxCount2 > 4 * maxCount) {
            return preserveCapitalization(correctWord2);
        }
        return preserveCapitalization(correctWord);
    }
}

/*
 This script runs your spellchecker on every input you provide.
 */
function autoCorrect() {
    var inputWords = document.getElementById('result').value;
    var input = inputWords.trim().split(/\s+/);
    var i;
    for (i = 0; i < input.length; i++) {
        var word = input[i];
        var correction = correct(word);
        if (correction === word) {
            //return " - " + word + " is spelled correctly.";
            console.log(word + " is spelled correctly.");
        } else if (typeof correction === "undefined") {
            //return " - " + word + " didn't get any output from the spellchecker.";
            console.log(word + " didn't get any output from the spellchecker.");
        } else {
            //return " - " + word + " should be spelled as " + correction + ".";
            console.log(word + " should be spelled as " + correction + ".");
            input[i] = correction;
        }
    }
    document.getElementById("result").value = input.join(" ");
    console.log("\nSpellcheck Finished!");
}
