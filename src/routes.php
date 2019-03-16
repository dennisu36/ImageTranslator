<?php

use Slim\Http\Request;
use Slim\Http\Response;

// Routes
/*
 * This is the defailt "slim app" route just to use as an example
$app->get('/[{name}]', function (Request $request, Response $response, array $args) {
    // Sample log message
    $this->logger->info("Slim-Skeleton '/' route");

    // Render index view
    return $this->renderer->render($response, 'index.phtml', $args);
});
*/

//This is the "home page" route that just loads the app
$app->get('/', function (Request $request, Response $response, array $args) {
    return $this->renderer->render($response, 'index.phtml', $args);
});

//This is the REST style API endpoint that our front-end communicates with.
$app->get('/translate', function (Request $request, Response $response, array $args) {
    $args['content'] = "Translate route is not finished. This will send and receive some JSON when done.";
    return $this->renderer->render($response, 'content.phtml', $args);
});
