<?php

use Slim\Http\Request;
use Slim\Http\Response;
use App\TranslationRequestValidator;
use App\AmazonTranslate;

//This is the "home page" route that just loads the app
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

    /* TODO Validate the parsed array to ensure all the required fields are there
     * if the array is not valid, return JSON to the client with 'error' field(s) populated. */
    if (TranslationRequestValidator::isTranslateArrayValid($translateRequestArray) == false) {
        $errorsArray = TranslationRequestValidator::getTranslateArrayErrors($translateRequestArray);
        return $response->withJson($errorsArray, 400);
    }

    /* TODO Pass the validated translation request array to the AmazonTranslate API */
    $translateApi = new AmazonTranslate();
    $translationResult = $translateApi->getTranslation($translateRequestArray['translate']);

    return $response->withJson($translationResult, 200);
});

$app-post('/rekognition', function (Request $request, Response $response, array $args) {

    return $response->withStatus(200);
});