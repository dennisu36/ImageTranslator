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
        $response = $this->runApp('POST', '/translate');

        $this->assertEquals(200, $response->getStatusCode());
    }

    /**
     * Try translating an actual set of strings in a different language
     */
    public function testTranslation()
    {
        $translationArray = [
            [
                'id' => 1,
                'source_language' => 'auto',
                'destination_language' => 'english',
                'text' => 'ما اسمك'
            ]
        ];

        $response = $this->runApp('POST', '/translate', $translationArray);

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function testGoodResponse()
    {
        $response = $this->runApp('GET', '/good');
        $this->assertEquals(200, $response->getStatusCode());
    }
}