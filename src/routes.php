<?php

use Slim\Http\Request;
use Slim\Http\Response;
use App\TranslationRequestValidator;
use App\AmazonTranslate;
use App\AmazonRekognition;

//This is the "home page" route that just loads the app interface/template
$app->get('/', function (Request $request, Response $response, array $args) {
    return $this->renderer->render($response, 'index.phtml', $args);
});

//This route just serves as an example of how a "good" test case will behave
$app->get('/good', function (Request $request, Response $response, $args = []) {
    return $response->withStatus(200);
});

//This is the REST style API endpoint that our front-end communicates with.
$app->post('/translate', function (Request $request, Response $response, array $args) {
    $translateRequestArray = $request->getParsedBody(); //this reads the JSON from the request and turns it into a PHP array

    if (TranslationRequestValidator::isTranslateArrayValid($translateRequestArray) == false) {
        $errorsArray = TranslationRequestValidator::getTranslateArrayErrors($translateRequestArray);
        return $response->withJson($errorsArray, 400);
    }

    $translateApi = new AmazonTranslate();
    $translationResult = $translateApi->getTranslation($translateRequestArray['translate']);

    return $response->withJson($translationResult, 200);
});

$app->post('/ocr', function (Request $request, Response $response, array $args) {
    $ocrRequestArray = $request->getParsedBody();
    /*TODO should validate the request but for now we're just going to pass it through
    * and assume everything is fine. */

    $ocrApi = new AmazonRekognition();
    $ocrResult = $ocrApi->getOCR($ocrRequestArray['image']);

    if (array_key_exists('error', $ocrResult)) {
        return $response->withJson($ocrResult, 400);
    }

    return $response->withJson($ocrResult, 200);
});