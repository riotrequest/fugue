<?php
/**
 * Fugue: how many people have the game open right now.
 *
 * Each open game pings about once a minute with a random id it made up itself.
 * Ids seen in the last two and a half minutes are counted. Nothing else is
 * kept: no IP addresses, no names, no history.
 *
 * The count lives outside the web root, in ~/fugue-data/online.json.
 */

header('Content-Type: application/json');
header('Cache-Control: no-store');

const WINDOW_SECONDS = 150;
const MAX_TRACKED = 5000;

$dir = dirname(__DIR__, 2) . '/fugue-data';
if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}

$handle = @fopen($dir . '/online.json', 'c+');
if (!$handle) {
    http_response_code(503);
    echo json_encode(['online' => null]);
    exit;
}

flock($handle, LOCK_EX);
$seen = json_decode(stream_get_contents($handle) ?: '{}', true);
if (!is_array($seen)) {
    $seen = [];
}

$now = time();
foreach ($seen as $id => $at) {
    if ($now - $at > WINDOW_SECONDS) {
        unset($seen[$id]);
    }
}

$id = $_GET['id'] ?? '';
if (is_string($id) && preg_match('/^[a-z0-9]{12,32}$/', $id) && (isset($seen[$id]) || count($seen) < MAX_TRACKED)) {
    $seen[$id] = $now;
}

ftruncate($handle, 0);
rewind($handle);
fwrite($handle, json_encode($seen));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

echo json_encode(['online' => max(1, count($seen))]);
