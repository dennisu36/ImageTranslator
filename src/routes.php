<?php

use Slim\Http\Request;
use Slim\Http\Response;

// Routes

/*$app->get('/[{name}]', function (Request $request, Response $response, array $args) {
    // Sample log message
    $this->logger->info("Slim-Skeleton '/' route");

    // Render index view
    return $this->renderer->render($response, 'index.phtml', $args);
});*/

$app->get('/translate', function (Request $request, Response $response, array $args) {
    $args['content'] = "Translate route is not finished.";
    return $this->renderer->render($response, 'content.phtml', $args);
});
