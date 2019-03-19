<?php

namespace ImageTranslator;

/**
 * Description of TranslateRequestValidator
 *
 * @author jaywalker
 */
class TranslationRequestValidator {

    public function __construct() {
        return;
    }

    public static function get_translate_array_errors($translateArray) {
        //echo "Called the function";
        /*$errorExample = [
            "translate" => [
                [
                    "id"=> 1,
                    "errors" => [
                        "Missing key: source_language",
                        "Missing key: destination_language",
                        "Missing key: text"
                    ]
                ],
                [
                    "id"=> 2,
                    "errors" => [
                        "Missing key: source_language",
                        "Missing key: destination_language",
                        "Missing key: text"
                    ]
                ]
            ]
        ];

        $responseData = ["translate" => []];

        //verify the integrity of the received translation request (all required keys are present)
        $requiredKeys = ['id', 'source_language', 'destination_language', 'text'];

        //TODO FIXME this needs some work, it's causing 500 error in the tests
        foreach ($translateRequest["translate"] as $translationBlockKey => $translationBlock) {
            foreach ($requiredKeys as $requiredKey) {
                if (!array_key_exists($requiredKey, $translationBlock) || empty($translateRequest[$key])) {
                    $responseData[strval($translationBlockKey)]['errors'] []= 'Missing key: ' . $requiredKey;
                }
            }
        }*/

        return "";
    }
}
