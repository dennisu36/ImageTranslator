<?php
// Encode the data.
$json = json_encode(
    array(
        "translate" => array(
            array(
                "id" => 1,
                "source_language" => 'latin',
                "destination_language" => 'english',
                "text" => 'Amare bene'
            ),
            array(
                "id" => 2,
                "source_language" => 'latin',
                "destination_language" => 'english',
                "text" => 'Bellum est malo'
            )
        )
    )
);
echo $json;

//var_dump(json_decode($json, true));
//print_r(json_decode($json,true));
//$array = json_decode($json,true)['translate'];
//print_r($array);


function convert($input) {
        $input = json_decode($input,true)['translate'];
        return($input);
}
print_r( convert($json));

?>

