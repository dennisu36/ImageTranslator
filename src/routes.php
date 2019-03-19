<?php

use Slim\Http\Request;
use Slim\Http\Response;
use ImageTranslator\TranslationRequestValidator;

//This is the "home page" route that just loads the app
$app->get('/', function (Request $request, Response $response, array $args) {
    return $this->renderer->render($response, 'index.phtml', $args);
});

$app->get('/good', function (Request $request, Response $response, $args = []) {
    return $response->withStatus(200);

});

//This is the REST style API endpoint that our front-end communicates with.
$app->post('/translate', function (Request $request, Response $response, array $args) {
    $translateRequest = $request->getParsedBody();

    //echo "Got here line 21";
    $translateRequest = TranslationRequestValidator::get_translate_array_errors($translateRequest);
    //echo "Got here line 22";
    if (empty($translateRequest)) {
        return $response->withStatus(400);
    }
    print_r($translateRequest);
    foreach ($translateRequest as $k => $v) {
        if (array_key_exists('errors', $v)) {
            return $response->withJson($translateRequest, 200); //just send back the JSON request with error fields filled out.
        }
    }
    echo "Got here line 29";

    return $response->withJson($errorExample, 200);
});