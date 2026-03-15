<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handleCORS();
startSession();

$action = $_GET['action'] ?? '';
$body   = getRequestBody();

function ok($data = null): void { successResponse($data); }
function fail(string $msg, int $code = 400): void { errorResponse($msg, $code); }

try {

    switch ($action) {

        // ── AUTH (disabled — use pro_auth.php) ────────────────────────────────
        case 'login':
        case 'logout':
        case 'me': {
            fail('Utilisez /api/pro_auth.php pour l\'authentification.', 403);
            break;
        }

        // ── MODELS (read from Sunbox DB) ──────────────────────────────────────
        case 'get_models': {
            requireSemiPro();
            $result = fetchModels();
            ok($result);
            break;
        }

        // ── MODEL OPTIONS (read from Sunbox DB) ───────────────────────────────
        case 'get_model_options': {
            requireSemiPro();
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT mo.*, oc.name as category_name, oc.description as category_description,
                       oc.image_id as category_image_id, mi.file_path as category_image_path
                FROM model_options mo
                LEFT JOIN option_categories oc ON mo.category_id = oc.id
                LEFT JOIN model_images mi ON oc.image_id = mi.id
                WHERE mo.model_id = ?
                ORDER BY oc.display_order ASC, mo.display_order ASC
            ");
            $stmt->execute([$modelId]);
            $options = $stmt->fetchAll();
            foreach ($options as &$opt) {
                $opt['category_image_url'] = sunboxAbsUrl(
                    $opt['category_image_path'] ? '/' . ltrim($opt['category_image_path'], '/') : null
                );
                unset($opt['category_image_path']);
            }
            ok($options);
            break;
        }

        case 'get_boq_options': {
            requireSemiPro();
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb = getSunboxDB();

            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.parent_id, bc.display_order, bc.qty_editable,
                       mi.file_path as image_path,
                       COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS own_price_ht
                FROM boq_categories bc
                LEFT JOIN boq_lines bl ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                LEFT JOIN model_images mi ON bc.image_id = mi.id
                WHERE bc.model_id = ? AND bc.is_option = TRUE
                GROUP BY bc.id
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            $allOptCats = $stmt->fetchAll();

            $priceMap = [];
            $childMap = [];
            foreach ($allOptCats as $cat) {
                $id = (int)$cat['id'];
                $priceMap[$id] = (float)$cat['own_price_ht'];
                if ($cat['parent_id'] !== null) {
                    $pid = (int)$cat['parent_id'];
                    if (!isset($childMap[$pid])) $childMap[$pid] = [];
                    $childMap[$pid][] = $id;
                }
            }

            $getTotalPrice = function(int $id) use (&$getTotalPrice, $priceMap, $childMap): float {
                $total = $priceMap[$id] ?? 0.0;
                foreach ($childMap[$id] ?? [] as $childId) {
                    $total += $getTotalPrice($childId);
                }
                return $total;
            };

            $options = [];
            foreach ($allOptCats as $cat) {
                if ($cat['parent_id'] !== null) continue;
                $id = (int)$cat['id'];
                $options[] = [
                    'id'            => $id,
                    'name'          => $cat['name'],
                    'display_order' => (int)$cat['display_order'],
                    'qty_editable'  => (bool)($cat['qty_editable'] ?? false),
                    'image_url'     => sunboxAbsUrl(
                        $cat['image_path'] ? '/' . ltrim($cat['image_path'], '/') : null
                    ),
                    'price_ht'      => round($getTotalPrice($id), 2),
                ];
            }
            ok($options);
            break;
        }

        case 'get_boq_base_categories': {
            requireSemiPro();
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT bc.id, bc.name, bc.display_order, bc.parent_id
                FROM boq_categories bc
                WHERE bc.model_id = ? AND bc.is_option = FALSE
                ORDER BY bc.name ASC
            ");
            $stmt->execute([$modelId]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_model_boq_price': {
            requireSemiPro();
            $modelId = (int)($body['model_id'] ?? 0);
            if ($modelId <= 0) fail('model_id manquant');
            $sdb  = getSunboxDB();
            $stmt = $sdb->prepare("
                SELECT COALESCE(SUM(ROUND(bl.quantity * COALESCE(ppl.unit_price, bl.unit_cost_ht) * (1 + bl.margin_percent / 100), 2)), 0) AS total_ht
                FROM boq_lines bl
                JOIN boq_categories bc ON bc.id = bl.category_id
                LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                WHERE bc.model_id = ? AND bc.is_option = FALSE
            ");
            $stmt->execute([$modelId]);
            ok(['total_ht' => (float)$stmt->fetchColumn()]);
            break;
        }

        case 'get_pool_boq_variables': {
            requireSemiPro();
            $sdb = getSunboxDB();
            ok($sdb->query("SELECT * FROM pool_boq_variables ORDER BY name ASC")->fetchAll());
            break;
        }

        case 'get_pool_boq_price_list': {
            requireSemiPro();
            $sdb  = getSunboxDB();
            $stmt = $sdb->query("SELECT id, reference, description, unit, unit_price, has_vat FROM pool_boq_price_list ORDER BY reference ASC");
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['has_vat']    = (bool)$r['has_vat'];
                $r['unit_price'] = (float)$r['unit_price'];
            }
            ok($rows);
            break;
        }

        case 'get_model_types': {
            requireSemiPro();
            $sdb = getSunboxDB();
            ok($sdb->query("SELECT * FROM model_types WHERE is_active = 1 ORDER BY display_order ASC")->fetchAll());
            break;
        }

        case 'get_model_type_dimensions': {
            requireSemiPro();
            $sdb  = getSunboxDB();
            $slug = $body['model_type_slug'] ?? '';
            if (!$slug) fail('model_type_slug manquant');
            $stmt = $sdb->prepare("SELECT * FROM model_type_dimensions WHERE model_type_slug = ? ORDER BY display_order ASC");
            $stmt->execute([$slug]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_modular_boq_variables': {
            requireSemiPro();
            $sdb  = getSunboxDB();
            $slug = $body['model_type_slug'] ?? '';
            if (!$slug) fail('model_type_slug manquant');
            $stmt = $sdb->prepare("SELECT * FROM modular_boq_variables WHERE model_type_slug = ? ORDER BY name ASC");
            $stmt->execute([$slug]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_modular_boq_price_list': {
            requireSemiPro();
            $sdb  = getSunboxDB();
            $slug = $body['model_type_slug'] ?? '';
            if (!$slug) fail('model_type_slug manquant');
            $stmt = $sdb->prepare("SELECT id, reference, description, unit, unit_price, has_vat FROM pool_boq_price_list ORDER BY reference ASC");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['has_vat']    = (bool)$r['has_vat'];
                $r['unit_price'] = (float)$r['unit_price'];
            }
            ok($rows);
            break;
        }

        // ── SETTINGS ──────────────────────────────────────────────────────────
        case 'get_settings': {
            requireSemiPro();
            $db   = getSemiProDB();
            $group = $body['group'] ?? null;
            $sql  = "SELECT setting_key, setting_value FROM semi_pro_settings";
            $params = [];
            if ($group) { $sql .= " WHERE setting_group = ?"; $params[] = $group; }
            $rows = $db->prepare($sql);
            $rows->execute($params);
            $settings = [];
            foreach ($rows->fetchAll() as $r) {
                $settings[$r['setting_key']] = $r['setting_value'];
            }
            ok($settings);
            break;
        }

        case 'update_setting': {
            requireSemiPro();
            $db = getSemiProDB();
            validateRequired($body, ['key', 'value']);
            $db->prepare("INSERT INTO semi_pro_settings (setting_key, setting_value) VALUES (?,?)
                          ON DUPLICATE KEY UPDATE setting_value=?, updated_at=NOW()")
               ->execute([$body['key'], $body['value'], $body['value']]);
            ok();
            break;
        }

        // ── CONTACTS ──────────────────────────────────────────────────────────
        case 'get_contacts': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $stmt = $db->prepare("
                SELECT * FROM semi_pro_contacts WHERE user_id = ? ORDER BY name ASC
            ");
            $stmt->execute([$uid]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_contact': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            if ($id <= 0) fail('id manquant');
            $stmt = $db->prepare("SELECT * FROM semi_pro_contacts WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $uid]);
            $c = $stmt->fetch();
            if (!$c) fail('Contact introuvable', 404);
            ok($c);
            break;
        }

        case 'create_contact': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['name']);
            $db->prepare("
                INSERT INTO semi_pro_contacts (user_id, name, email, phone, address, company, notes)
                VALUES (?,?,?,?,?,?,?)
            ")->execute([
                $uid,
                sanitize($body['name']),
                sanitize($body['email'] ?? ''),
                sanitize($body['phone'] ?? ''),
                sanitize($body['address'] ?? ''),
                sanitize($body['company'] ?? ''),
                sanitize($body['notes'] ?? ''),
            ]);
            ok(['id' => (int)$db->lastInsertId()]);
            break;
        }

        case 'update_contact': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = [];
            $params = [];
            foreach (['name','email','phone','address','company','notes'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = sanitize($body[$f]); }
            }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = $id;
                $params[] = $uid;
                $db->prepare("UPDATE semi_pro_contacts SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")
                   ->execute($params);
            }
            ok();
            break;
        }

        case 'delete_contact': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            $db->prepare("DELETE FROM semi_pro_contacts WHERE id = ? AND user_id = ?")->execute([$id, $uid]);
            ok();
            break;
        }

        // ── QUOTES ────────────────────────────────────────────────────────────
        case 'get_quotes': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $stmt = $db->prepare("
                SELECT q.*, c.name AS contact_name
                FROM semi_pro_quotes q
                LEFT JOIN semi_pro_contacts c ON c.id = q.contact_id AND c.user_id = q.user_id
                WHERE q.user_id = ?
                ORDER BY q.created_at DESC
            ");
            $stmt->execute([$uid]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_quote': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            if ($id <= 0) fail('id manquant');
            $stmt = $db->prepare("SELECT * FROM semi_pro_quotes WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $uid]);
            $q = $stmt->fetch();
            if (!$q) fail('Devis introuvable', 404);
            ok($q);
            break;
        }

        case 'get_quote_with_details': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            if ($id <= 0) fail('id manquant');
            $stmt = $db->prepare("
                SELECT q.*, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
                FROM semi_pro_quotes q
                LEFT JOIN semi_pro_contacts c ON c.id = q.contact_id AND c.user_id = q.user_id
                WHERE q.id = ? AND q.user_id = ?
            ");
            $stmt->execute([$id, $uid]);
            $q = $stmt->fetch();
            if (!$q) fail('Devis introuvable', 404);
            $optStmt = $db->prepare("SELECT * FROM semi_pro_quote_options WHERE quote_id = ? ORDER BY id ASC");
            $optStmt->execute([$id]);
            $q['selected_options'] = $optStmt->fetchAll();
            if (!empty($q['custom_dimensions'])) {
                $q['custom_dimensions'] = json_decode($q['custom_dimensions'], true);
            }
            ok($q);
            break;
        }

        case 'create_quote': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['model_id', 'model_name', 'model_type', 'base_price', 'total_price',
                                     'customer_name', 'customer_email', 'customer_phone']);

            $db->beginTransaction();
            try {
                $yearMonth  = date('Ym');
                $modelType  = $body['model_type'];
                $refPrefix  = ($modelType === 'container') ? 'SCQ'
                            : (($modelType === 'pool') ? 'SPQ'
                            : 'S' . strtoupper(substr($modelType, 0, 1)) . 'Q');
                $maxNext    = (int)$db->query("SELECT COALESCE(MAX(id),0)+1 FROM semi_pro_quotes")->fetchColumn();
                $reference  = sprintf('%s-%s-%06d', $refPrefix, $yearMonth, $maxNext);
                $validUntil = date('Y-m-d', strtotime('+30 days'));

                $customerEmail   = sanitize($body['customer_email']);
                $customerName    = sanitize($body['customer_name']);
                $customerPhone   = sanitize($body['customer_phone']);
                $customerAddress = sanitize($body['customer_address'] ?? '');

                // Create or update contact for this user
                $contactId = isset($body['contact_id']) ? (int)$body['contact_id'] : null;
                if (!$contactId && $customerEmail) {
                    $cStmt = $db->prepare("SELECT id FROM semi_pro_contacts WHERE email = ? AND user_id = ?");
                    $cStmt->execute([$customerEmail, $uid]);
                    $existing = $cStmt->fetch();
                    if ($existing) {
                        $contactId = (int)$existing['id'];
                        $db->prepare("UPDATE semi_pro_contacts SET name=?, phone=?, address=?, updated_at=NOW() WHERE id=? AND user_id=?")
                           ->execute([$customerName, $customerPhone, $customerAddress, $contactId, $uid]);
                    } else {
                        $db->prepare("INSERT INTO semi_pro_contacts (user_id, name, email, phone, address) VALUES (?,?,?,?,?)")
                           ->execute([$uid, $customerName, $customerEmail, $customerPhone, $customerAddress]);
                        $contactId = (int)$db->lastInsertId();
                    }
                }

                $nullFloat = fn($k) => isset($body[$k]) && $body[$k] !== null ? (float)$body[$k] : null;
                $db->prepare("
                    INSERT INTO semi_pro_quotes
                        (user_id, reference_number, contact_id, customer_name, customer_email, customer_phone,
                         customer_address, customer_message, model_id, model_name, model_type,
                         base_price, options_total, total_price, status, valid_until,
                         pool_longueur_la, pool_largeur_la, pool_profondeur_la,
                         pool_longueur_lb, pool_largeur_lb, pool_profondeur_lb,
                         pool_longueur_ta, pool_largeur_ta, pool_profondeur_ta,
                         pool_longueur_tb, pool_largeur_tb, pool_profondeur_tb,
                         modular_longueur, modular_largeur, modular_nb_etages, custom_dimensions)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'open',?,
                            ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ")->execute([
                    $uid,
                    $reference,
                    $contactId,
                    $customerName, $customerEmail, $customerPhone,
                    $customerAddress,
                    sanitize($body['customer_message'] ?? ''),
                    (int)$body['model_id'],
                    sanitize($body['model_name']),
                    $modelType,
                    (float)$body['base_price'],
                    (float)($body['options_total'] ?? 0),
                    (float)$body['total_price'],
                    $validUntil,
                    $nullFloat('pool_longueur_la'), $nullFloat('pool_largeur_la'), $nullFloat('pool_profondeur_la'),
                    $nullFloat('pool_longueur_lb'), $nullFloat('pool_largeur_lb'), $nullFloat('pool_profondeur_lb'),
                    $nullFloat('pool_longueur_ta'), $nullFloat('pool_largeur_ta'), $nullFloat('pool_profondeur_ta'),
                    $nullFloat('pool_longueur_tb'), $nullFloat('pool_largeur_tb'), $nullFloat('pool_profondeur_tb'),
                    $nullFloat('modular_longueur'), $nullFloat('modular_largeur'),
                    isset($body['modular_nb_etages']) ? (int)$body['modular_nb_etages'] : null,
                    isset($body['custom_dimensions']) ? json_encode($body['custom_dimensions']) : null,
                ]);
                $quoteId = (int)$db->lastInsertId();

                $reference = sprintf('%s-%s-%06d', $refPrefix, $yearMonth, $quoteId);
                $db->prepare("UPDATE semi_pro_quotes SET reference_number=?, approval_token=? WHERE id=?")
                   ->execute([$reference, bin2hex(random_bytes(32)), $quoteId]);

                if (!empty($body['selected_options']) && is_array($body['selected_options'])) {
                    $oStmt = $db->prepare("INSERT INTO semi_pro_quote_options (quote_id, option_id, option_name, option_price) VALUES (?,?,?,?)");
                    foreach ($body['selected_options'] as $opt) {
                        $oid = (int)($opt['option_id'] ?? 0);
                        $oStmt->execute([$quoteId, $oid > 0 ? $oid : null, sanitize($opt['option_name']), (float)$opt['option_price']]);
                    }
                }

                $db->commit();
                ok(['id' => $quoteId, 'reference_number' => $reference, 'contact_id' => $contactId]);
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'update_quote_status': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['id', 'status']);
            $validStatuses = ['draft','open','validated','cancelled','pending','approved','rejected','completed'];
            if (!in_array($body['status'], $validStatuses)) fail('Statut invalide');
            $db->prepare("UPDATE semi_pro_quotes SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?")
               ->execute([$body['status'], (int)$body['id'], $uid]);
            ok();
            break;
        }

        case 'update_quote': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['id']);
            $id = (int)$body['id'];
            $sets = [];
            $params = [];
            foreach (['customer_name','customer_email','customer_phone','customer_address','customer_message','notes','status','valid_until'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = sanitize($body[$f]); }
            }
            foreach (['base_price','options_total','total_price'] as $f) {
                if (array_key_exists($f, $body)) { $sets[] = "$f = ?"; $params[] = (float)$body[$f]; }
            }
            if (!empty($sets)) {
                $sets[] = 'updated_at = NOW()';
                $params[] = $id;
                $params[] = $uid;
                $db->prepare("UPDATE semi_pro_quotes SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")
                   ->execute($params);
            }
            ok();
            break;
        }

        case 'delete_quote': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            $db->prepare("DELETE FROM semi_pro_quotes WHERE id = ? AND user_id = ?")->execute([$id, $uid]);
            ok();
            break;
        }

        // ── BOQ / PURCHASE REPORTS ────────────────────────────────────────────
        case 'request_boq_report': {
            requireSemiPro();
            $db  = getSemiProDB();
            $sdb = getSunboxDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['quote_id']);
            $quoteId = (int)$body['quote_id'];

            $qStmt = $db->prepare("SELECT * FROM semi_pro_quotes WHERE id = ? AND user_id = ?");
            $qStmt->execute([$quoteId, $uid]);
            $quote = $qStmt->fetch();
            if (!$quote) fail('Devis introuvable', 404);

            $modelId = (int)$quote['model_id'];

            // Get model type
            $mStmt = $sdb->prepare("SELECT type FROM models WHERE id = ? LIMIT 1");
            $mStmt->execute([$modelId]);
            $modelRow = $mStmt->fetch();
            if (!$modelRow) fail('Modèle introuvable');
            $modelType = $modelRow['type'];

            // Build BOQ lines from Sunbox
            $isCustom = !in_array($modelType, ['container', 'pool']);
            $linesSql = $isCustom
                ? "SELECT bl.*, bc.name AS category_name, bc.is_option,
                          s.name AS supplier_name,
                          COALESCE(ppl.unit_price, bl.unit_cost_ht) AS resolved_unit_price,
                          COALESCE(ppl.description, bl.description) AS resolved_description
                   FROM boq_lines bl
                   JOIN boq_categories bc ON bc.id = bl.category_id AND bc.model_id = ?
                   LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                   LEFT JOIN suppliers s ON bl.supplier_id = s.id
                   ORDER BY bc.display_order ASC, bl.display_order ASC"
                : "SELECT bl.*, bc.name AS category_name, bc.is_option,
                          s.name AS supplier_name,
                          COALESCE(ppl.unit_price, bl.unit_cost_ht) AS resolved_unit_price
                   FROM boq_lines bl
                   JOIN boq_categories bc ON bc.id = bl.category_id AND bc.model_id = ?
                   LEFT JOIN pool_boq_price_list ppl ON bl.price_list_id = ppl.id
                   LEFT JOIN suppliers s ON bl.supplier_id = s.id
                   ORDER BY bc.display_order ASC, bl.display_order ASC";

            $blStmt = $sdb->prepare($linesSql);
            $blStmt->execute([$modelId]);
            $boqLines = $blStmt->fetchAll();

            // Get selected options for this quote
            $selOptStmt = $db->prepare("
                SELECT sqo.option_id, sqo.option_name, sqo.option_price
                FROM semi_pro_quote_options sqo
                WHERE sqo.quote_id = ?
            ");
            $selOptStmt->execute([$quoteId]);
            $selectedOptions = $selOptStmt->fetchAll();
            $selectedOptionIds = array_column(array_filter($selectedOptions, fn($o) => $o['option_id']), 'option_id');

            // Create report in semi-pro DB
            $db->beginTransaction();
            try {
                $db->prepare("
                    INSERT INTO semi_pro_purchase_reports (user_id, quote_id, quote_reference, model_name, status, total_amount)
                    VALUES (?,?,?,?,'in_progress',?)
                ")->execute([$uid, $quoteId, $quote['reference_number'], $quote['model_name'], (float)$quote['total_price']]);
                $reportId = (int)$db->lastInsertId();

                $iStmt = $db->prepare("
                    INSERT INTO semi_pro_purchase_report_items
                        (report_id, supplier_name, category_name, description, quantity, unit, unit_price, total_price, is_option, display_order)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                ");
                $displayOrder = 0;
                foreach ($boqLines as $line) {
                    $isOpt = (bool)($line['is_option'] ?? false);
                    if ($isOpt && !in_array((int)($line['option_id'] ?? 0), $selectedOptionIds)) continue;
                    $unitPrice = (float)$line['resolved_unit_price'];
                    $qty       = (float)$line['quantity'];
                    $margin    = (float)$line['margin_percent'];
                    $totalHt   = round($qty * $unitPrice * (1 + $margin / 100), 2);
                    $iStmt->execute([
                        $reportId,
                        $line['supplier_name'] ?? 'Fournisseur non défini',
                        $line['category_name'],
                        $line['resolved_description'] ?? $line['description'],
                        $qty,
                        $line['unit'] ?? '',
                        round($unitPrice * (1 + $margin / 100), 2),
                        $totalHt,
                        $isOpt ? 1 : 0,
                        $displayOrder++,
                    ]);
                }

                // Add option lines not in BOQ
                foreach ($selectedOptions as $opt) {
                    if ($opt['option_id']) continue; // already handled above
                    $iStmt->execute([
                        $reportId,
                        'Option',
                        'Options',
                        $opt['option_name'],
                        1,
                        'u',
                        (float)$opt['option_price'],
                        (float)$opt['option_price'],
                        1,
                        $displayOrder++,
                    ]);
                }

                $db->commit();
                ok(['id' => $reportId]);
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        }

        case 'get_purchase_reports': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $stmt = $db->prepare("
                SELECT r.*, q.customer_name, q.customer_email
                FROM semi_pro_purchase_reports r
                LEFT JOIN semi_pro_quotes q ON q.id = r.quote_id AND q.user_id = r.user_id
                WHERE r.user_id = ?
                ORDER BY r.created_at DESC
            ");
            $stmt->execute([$uid]);
            ok($stmt->fetchAll());
            break;
        }

        case 'get_purchase_report': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            $rStmt = $db->prepare("
                SELECT r.*, q.customer_name, q.customer_email, q.model_type
                FROM semi_pro_purchase_reports r
                LEFT JOIN semi_pro_quotes q ON q.id = r.quote_id AND q.user_id = r.user_id
                WHERE r.id = ? AND r.user_id = ?
            ");
            $rStmt->execute([$id, $uid]);
            $report = $rStmt->fetch();
            if (!$report) fail('Rapport introuvable', 404);
            $iStmt = $db->prepare("SELECT * FROM semi_pro_purchase_report_items WHERE report_id = ? ORDER BY display_order ASC");
            $iStmt->execute([$id]);
            $report['items'] = $iStmt->fetchAll();
            foreach ($report['items'] as &$item) {
                $item['is_ordered'] = (bool)$item['is_ordered'];
                $item['is_option']  = (bool)$item['is_option'];
            }
            ok($report);
            break;
        }

        case 'toggle_report_item': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['item_id']);
            // Verify the item belongs to this user
            $stmt = $db->prepare("
                SELECT i.id FROM semi_pro_purchase_report_items i
                JOIN semi_pro_purchase_reports r ON r.id = i.report_id
                WHERE i.id = ? AND r.user_id = ?
            ");
            $stmt->execute([(int)$body['item_id'], $uid]);
            if (!$stmt->fetch()) fail('Item introuvable', 404);
            $db->prepare("UPDATE semi_pro_purchase_report_items SET is_ordered = NOT is_ordered WHERE id = ?")
               ->execute([(int)$body['item_id']]);
            ok();
            break;
        }

        case 'update_report_status': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            validateRequired($body, ['id', 'status']);
            $db->prepare("UPDATE semi_pro_purchase_reports SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?")
               ->execute([$body['status'], (int)$body['id'], $uid]);
            ok();
            break;
        }

        case 'delete_purchase_report': {
            requireSemiPro();
            $db  = getSemiProDB();
            $uid = getSemiProUserId();
            $id  = (int)($body['id'] ?? 0);
            $db->prepare("DELETE FROM semi_pro_purchase_reports WHERE id = ? AND user_id = ?")->execute([$id, $uid]);
            ok();
            break;
        }

        default:
            fail("Action inconnue: $action", 404);
    }

} catch (Throwable $e) {
    error_log('semi_pro api/index.php error [' . $action . ']: ' . $e->getMessage());
    fail(API_DEBUG ? $e->getMessage() : 'Erreur serveur', 500);
}
