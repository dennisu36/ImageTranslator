<?php

namespace App;

use App\OCRInterface;
use Aws\Rekognition\RekognitionClient;
use Aws\Exception\AwsException;

/**
 * Description of AmazonRekognition
 *
 * @author jaywalker
 */
class AmazonRekognition implements OCRInterface {

    private function convertOCRResponseToTesseractFormat($rekognitionResponse) {
        $newAry = [];
        foreach ($rekognitionResponse as $responseKey => $lineData) {
            $newAry += [
                "text" => $lineData['DetectedText'],
                "bbox" => $lineData['BoundingBox']
            ];
        }
        return $newAry;
    }

    public function getTranslation($base64EncodedImage) {
	$client = new Aws\Rekognition\RekognitionClient([
            'profile' => 'default',
            'region' => 'us-east-2',
            'version' => 'latest',
	]);

	$result = $client->detectText([
            'Image' => [
                'Bytes' => base64_decode($base64EncodedImage),
            ],
	]);

	$textReceived = $result;
	//Rekognition gives you an array of lines and words and to make it not repeat it only prints it if it is a word, not a line of text.
	$count = 0;
        $textToBePassed = [];
	for($n = 0;$n < sizeOf($textReceived['TextDetections']); $n++) {
            if($textReceived['TextDetections'][$n]['Type'] == 'LINE') {
                //Creates a new array that takes the detectedtext per line and the boundingbox paramaters and puts them into a new array...
                //...called $textToBePassed. This will be the array sent back to the client.
                $textToBePassed[$count] = [
                    "DetectedText" => $textReceived['TextDetections'][$n]['DetectedText'],
                    "BoundingBox" => $textReceived['TextDetections'][$n]['Geometry']['BoundingBox']
                ];
                $count++;
            }
	}
	return $this->convertOCRResponseToTesseractFormat($textToBePassed);
    }
}
