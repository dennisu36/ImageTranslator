<?php

namespace App;

/**
 * Description of TranslateRequestValidator
 *
 * @author jaywalker
 */
class TranslationRequestValidator {

    public static function getTranslateArrayErrors($translateArray = []) {
        /*
        $errorExample = [
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
        */

        //First check that the 'translate' key is present
        if (!array_key_exists("translate", $translateArray) || empty($translateArray['translate'])) {
            $translateArray['errors'] = [
                'Missing key: translate'
            ]; //no need to check for anything else since this is the first thing required
            return $translateArray;
        }

        //verify the integrity of the received translation request (all required keys are present)
        $requiredKeys = ['id', 'source_language', 'destination_language', 'text'];

        foreach ($translateArray['translate'] as $translationBlockKey => $translationBlock) {
            foreach ($requiredKeys as $requiredKey) {
                if (!array_key_exists($requiredKey, $translationBlock) || empty($translationBlock[$requiredKey])) {
                    $translateArray['translate'][strval($translationBlockKey)]['errors'][$requiredKey] = "Key required.";
                } else if (!is_string($translationBlock[$requiredKey]) && $requiredKey != 'id') {
                    $translateArray['translate'][strval($translationBlockKey)]['errors'][$requiredKey] = "Value must be string.";
                }
            }
        }

        return $translateArray;
    }

    public static function isTranslateArrayValid($translateArray = []) {
        $translateArrayWithErrors = TranslationRequestValidator::getTranslateArrayErrors($translateArray);
        if (TranslationRequestValidator::recursiveFind($translateArrayWithErrors, 'errors') === null) {
            return true;
        }
        return false;
    }

    private static function recursiveFind(array $haystack, $needle)
    {
        $iterator  = new \RecursiveArrayIterator($haystack);
        $recursive = new \RecursiveIteratorIterator(
            $iterator,
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($recursive as $key => $value) {
            if ($key === $needle) {
                return $value;
            }
        }
        return null;
    }
}