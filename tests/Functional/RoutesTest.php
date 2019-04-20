<?php

namespace Tests\Functional;

class RoutesTest extends BaseTestCase
{

    /**
     * Test that the homepage loaded and displays the right heading.
     */
    public function testHomepage()
    {
        $response = $this->runApp('GET', '/');

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertContains("Image Translate", (string)$response->getBody());
    }


    /**
     * Test that the translate route works correctly.
     */
    public function testTranslateResponse()
    {
        //$response = $this->runApp('POST', '/translate');

        //$this->assertEquals(200, $response->getStatusCode());

        //Test that a valid response gives us back a response with the right keys
        $goodJsonData = [
            'translate' => [
                [
                    'id' => 1,
                    'source_language' => 'english',
                    'destination_language' => 'french',
                    'text' => 'hello'
                ],
                [
                    'id' => 2,
                    'source_language' => 'english',
                    'destination_language' => 'french',
                    'text' => 'hello'
                ]
            ]
        ];

        $response = $this->runApp('POST', '/translate', $goodJsonData);
        $this->assertEquals(200, $response->getStatusCode());

        //Test that an invalid response returns an error
        $badJsonData = [
            'translate' => [
                [
                    'id' => 1,
                    //missing source language
                    'destination_language' => 'french',
                    'text' => 'hello'
                ]
            ]
        ];

        $responseWithErrors = [
            'translate' => [
                [
                    'id' => 1,
                    //missing source language
                    'destination_language' => 'french',
                    'text' => 'hello',
                    'errors' => [
                        'source_language' => 'Key required.'
                    ]
                ]
            ]
        ];

        $response = $this->runApp('POST', '/translate', $badJsonData);
        $this->assertEquals(400, $response->getStatusCode());
        $decodedResponse = json_decode($response->getBody(), true);
        $this->assertEquals($decodedResponse, $responseWithErrors);

    }

    /**
     * Try translating an actual set of strings in a different language
     */
    public function testTranslation()
    {
        $translationArray = [
            'translate' => [
                [
                    'id' => 1,
                    'source_language' => 'arabic',
                    'destination_language' => 'english',
                    'text' => 'ما اسمك'
                ]
            ]
        ];

        $response = $this->runApp('POST', '/translate', $translationArray);

        $this->assertEquals(200, $response->getStatusCode());
    }


    /**
     * This is just a generic test to make sure that we get a response back.
     */
    public function testGoodResponse()
    {
        $response = $this->runApp('GET', '/good');
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function testRekognitionRequest()
    {
        $response = $this->runApp('POST', '/rekognition');
        $this->assertEquals(200, $response->getStatusCode());
    }
}