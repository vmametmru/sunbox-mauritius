-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 03, 2026 at 04:27 AM
-- Server version: 8.0.39-cll-lve
-- PHP Version: 8.4.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mauriti2_sunbox_mauritius_bcreative`
--

-- --------------------------------------------------------

--
-- Table structure for table `pro_contacts`
--

CREATE TABLE `pro_contacts` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT '',
  `phone` varchar(50) DEFAULT '',
  `address` text,
  `company` varchar(255) DEFAULT '',
  `device_id` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_contacts`
--

INSERT INTO `pro_contacts` (`id`, `name`, `email`, `phone`, `address`, `company`, `device_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'test', 'test@test.com', '+2305654564', '', '', 'device_a0bc58dc-2794-4953-b43f-b49e9e0c074f', NULL, '2026-03-02 06:33:28', '2026-03-02 13:57:17');

-- --------------------------------------------------------

--
-- Table structure for table `pro_discounts`
--

CREATE TABLE `pro_discounts` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `apply_to` enum('base_price','options','both') NOT NULL DEFAULT 'both',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `model_ids` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pro_email_signatures`
--

CREATE TABLE `pro_email_signatures` (
  `id` int NOT NULL,
  `signature_key` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `body_html` longtext NOT NULL,
  `logo_url` varchar(500) DEFAULT '',
  `photo_url` varchar(500) DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pro_email_templates`
--

CREATE TABLE `pro_email_templates` (
  `id` int NOT NULL,
  `template_key` varchar(100) NOT NULL,
  `template_type` enum('quote','notification','password_reset','contact','status_change','other') NOT NULL DEFAULT 'other',
  `name` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `body_html` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pro_purchase_reports`
--

CREATE TABLE `pro_purchase_reports` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `quote_reference` varchar(50) DEFAULT '',
  `model_name` varchar(255) DEFAULT '',
  `status` enum('in_progress','completed') DEFAULT 'in_progress',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_purchase_reports`
--

INSERT INTO `pro_purchase_reports` (`id`, `quote_id`, `quote_reference`, `model_name`, `status`, `total_amount`, `created_at`, `updated_at`) VALUES
(2, 1, 'PCQ-202603-000001', 'Maison Conteneur - 2X20-1B', 'in_progress', 1161510.00, '2026-03-02 10:43:12', '2026-03-02 10:43:12'),
(3, 2, 'PCQ-202603-000002', 'Maison Conteneur - 2X20-1B', 'in_progress', 1235510.00, '2026-03-02 13:42:13', '2026-03-02 13:42:13');

-- --------------------------------------------------------

--
-- Table structure for table `pro_purchase_report_items`
--

CREATE TABLE `pro_purchase_report_items` (
  `id` int NOT NULL,
  `report_id` int NOT NULL,
  `supplier_name` varchar(255) DEFAULT 'Fournisseur non défini',
  `category_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `quantity` decimal(10,3) DEFAULT '1.000',
  `unit` varchar(50) DEFAULT '',
  `unit_price` decimal(12,2) DEFAULT '0.00',
  `total_price` decimal(12,2) DEFAULT '0.00',
  `is_ordered` tinyint(1) DEFAULT '0',
  `is_option` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_purchase_report_items`
--

INSERT INTO `pro_purchase_report_items` (`id`, `report_id`, `supplier_name`, `category_name`, `description`, `quantity`, `unit`, `unit_price`, `total_price`, `is_ordered`, `is_option`, `display_order`) VALUES
(29, 2, 'Electricien', 'Electricité', 'Electricien', 1.000, 'forfait', 20000.00, 20000.00, 0, 0, 0),
(30, 2, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Porte Coullissante 3500mm', 1.000, 'unité', 60000.00, 60000.00, 0, 0, 1),
(31, 2, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Fenêtre dans la salle de bain 500mm x 500mm', 1.000, 'unité', 4000.00, 4000.00, 0, 0, 2),
(32, 2, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Fenêtre dans la cuisine et 1 dans le salon 1100mm x 1100mm', 2.000, 'unité', 18000.00, 36000.00, 0, 0, 3),
(33, 2, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 x Fenêtres dans la chambre 500mm x 1100mm', 2.000, 'unité', 15000.00, 30000.00, 0, 0, 4),
(34, 2, 'Fournisseur non défini', 'Transport', 'Camion Conteneur', 3.000, 'unité', 12500.00, 37500.00, 0, 0, 5),
(35, 2, 'Fournisseur non défini', 'Revêtement des Sols', 'SPC & Plynthes (inc Installation)', 30.000, 'm²', 1200.00, 36000.00, 0, 0, 6),
(36, 2, 'Fournisseur non défini', 'Ouvertures en Bois', 'Porte Coulissante galendage en bois 2m50', 1.000, 'unité', 80000.00, 80000.00, 0, 0, 7),
(37, 2, 'Fournisseur non défini', 'Ouvertures en Bois', 'Porte en bois de 750mm pour la salle de bain', 1.000, 'unité', 22000.00, 22000.00, 0, 0, 8),
(38, 2, 'Jean Eric Basraz', 'Revêtement des Sols', 'Main d\'Oeuvre (Béton et SPC)', 6.000, 'jour', 2500.00, 15000.00, 0, 0, 9),
(39, 2, 'Medlog', 'Structure', '2 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), Toit en 2 pentes en Tole, avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 2.000, 'unité', 350000.00, 700000.00, 0, 0, 10),
(40, 2, 'Palco Waterproofing', 'Revêtement des Sols', 'Couche de béton autonivellant (1 a 8mm)', 30.000, 'm²', 1500.00, 45000.00, 0, 0, 11),
(41, 2, 'Quincaillerie(s)', 'Electricité', 'Lumieres Plafond', 6.000, 'unité', 300.00, 1800.00, 0, 0, 12),
(42, 2, 'Quincaillerie(s)', 'Electricité', 'Prises Doubles', 5.000, 'unité', 900.00, 4500.00, 0, 0, 13),
(43, 2, 'Quincaillerie(s)', 'Electricité', 'Prise 16A', 4.000, 'unité', 800.00, 3200.00, 0, 0, 14),
(44, 2, 'Quincaillerie(s)', 'Electricité', 'Prise Etanche 16A', 1.000, 'unité', 1500.00, 1500.00, 0, 0, 15),
(45, 2, 'Quincaillerie(s)', 'Electricité', 'Fils Electriques', 1.000, 'forfait', 10000.00, 10000.00, 0, 0, 16),
(46, 2, 'Quincaillerie(s)', 'Electricité', 'Isolateur 63A', 1.000, 'unité', 2000.00, 2000.00, 0, 0, 17),
(47, 2, 'Quincaillerie(s)', 'Electricité', 'RCD 63A', 1.000, 'unité', 2500.00, 2500.00, 0, 0, 18),
(48, 2, 'Quincaillerie(s)', 'Electricité', 'Breakers', 4.000, 'unité', 600.00, 2400.00, 0, 0, 19),
(49, 2, 'Quincaillerie(s)', 'Electricité', 'Panneau électrique', 1.000, 'unité', 2000.00, 2000.00, 0, 0, 20),
(50, 2, 'Charlie Jacquelin', 'Amélioration Fondations (Basiques -> Complètes)', 'Main d\'Oeuvre', 5.000, 'jour', 5000.00, 25000.00, 0, 1, 0),
(51, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Parpaings 200mm', 120.000, 'unité', 35.00, 4200.00, 0, 1, 1),
(52, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Parpaing U 200mm', 60.000, 'unité', 60.00, 3600.00, 0, 1, 2),
(53, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Rocksand 0.2', 3.000, 'tonne', 970.00, 2910.00, 0, 1, 3),
(54, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Macadam ½', 2.000, 'tonne', 700.00, 1400.00, 0, 1, 4),
(55, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Transport', 1.000, 'forfait', 4500.00, 4500.00, 0, 1, 5),
(56, 2, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Barres Y10', 1.000, 'forfait', 4500.00, 4500.00, 0, 1, 6),
(57, 3, 'Electricien', 'Electricité', 'Electricien', 1.000, 'forfait', 20000.00, 20000.00, 1, 0, 0),
(58, 3, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Porte Coullissante 3500mm', 1.000, 'unité', 60000.00, 60000.00, 1, 0, 1),
(59, 3, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Fenêtre dans la salle de bain 500mm x 500mm', 1.000, 'unité', 4000.00, 4000.00, 1, 0, 2),
(60, 3, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 x Fenêtre dans la cuisine et 1 dans le salon 1100mm x 1100mm', 2.000, 'unité', 18000.00, 36000.00, 1, 0, 3),
(61, 3, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 x Fenêtres dans la chambre 500mm x 1100mm', 2.000, 'unité', 15000.00, 30000.00, 1, 0, 4),
(62, 3, 'Fournisseur non défini', 'Transport', 'Camion Conteneur', 3.000, 'unité', 12500.00, 37500.00, 1, 0, 5),
(63, 3, 'Fournisseur non défini', 'Revêtement des Sols', 'SPC & Plynthes (inc Installation)', 30.000, 'm²', 1200.00, 36000.00, 1, 0, 6),
(64, 3, 'Fournisseur non défini', 'Ouvertures en Bois', 'Porte Coulissante galendage en bois 2m50', 1.000, 'unité', 80000.00, 80000.00, 1, 0, 7),
(65, 3, 'Fournisseur non défini', 'Ouvertures en Bois', 'Porte en bois de 750mm pour la salle de bain', 1.000, 'unité', 22000.00, 22000.00, 0, 0, 8),
(66, 3, 'Jean Eric Basraz', 'Revêtement des Sols', 'Main d\'Oeuvre (Béton et SPC)', 6.000, 'jour', 2500.00, 15000.00, 0, 0, 9),
(67, 3, 'Sunbox', 'Structure', '2 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), Toit en 2 pentes en Tole, avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 2.000, 'unité', 350000.00, 700000.00, 1, 0, 10),
(68, 3, 'Palco Waterproofing', 'Revêtement des Sols', 'Couche de béton autonivellant (1 a 8mm)', 30.000, 'm²', 1500.00, 45000.00, 0, 0, 11),
(69, 3, 'Quincaillerie(s)', 'Electricité', 'Lumieres Plafond', 6.000, 'unité', 300.00, 1800.00, 0, 0, 12),
(70, 3, 'Quincaillerie(s)', 'Electricité', 'Prises Doubles', 5.000, 'unité', 900.00, 4500.00, 0, 0, 13),
(71, 3, 'Quincaillerie(s)', 'Electricité', 'Prise 16A', 4.000, 'unité', 800.00, 3200.00, 0, 0, 14),
(72, 3, 'Quincaillerie(s)', 'Electricité', 'Prise Etanche 16A', 1.000, 'unité', 1500.00, 1500.00, 0, 0, 15),
(73, 3, 'Quincaillerie(s)', 'Electricité', 'Fils Electriques', 1.000, 'forfait', 10000.00, 10000.00, 0, 0, 16),
(74, 3, 'Quincaillerie(s)', 'Electricité', 'Isolateur 63A', 1.000, 'unité', 2000.00, 2000.00, 0, 0, 17),
(75, 3, 'Quincaillerie(s)', 'Electricité', 'RCD 63A', 1.000, 'unité', 2500.00, 2500.00, 0, 0, 18),
(76, 3, 'Quincaillerie(s)', 'Electricité', 'Breakers', 4.000, 'unité', 600.00, 2400.00, 0, 0, 19),
(77, 3, 'Quincaillerie(s)', 'Electricité', 'Panneau électrique', 1.000, 'unité', 2000.00, 2000.00, 0, 0, 20),
(78, 3, 'Charlie Jacquelin', 'Amélioration Fondations (Basiques -> Complètes)', 'Main d\'Oeuvre', 5.000, 'jour', 5000.00, 25000.00, 0, 1, 0),
(79, 3, 'Fournisseur non défini', 'Ameublement', 'Table/Rangement pour la Salle de bain', 1.000, 'unité', 10000.00, 10000.00, 0, 1, 1),
(80, 3, 'Fournisseur non défini', 'Ameublement', 'Placard', 1.000, 'unité', 25000.00, 25000.00, 0, 1, 2),
(81, 3, 'Fournisseur non défini', 'Ameublement', 'Lit de 1m90 x 1.35', 1.000, 'unité', 25000.00, 25000.00, 0, 1, 3),
(82, 3, 'Fournisseur non défini', 'Ameublement', 'Miroir', 1.000, 'unité', 4000.00, 4000.00, 0, 1, 4),
(83, 3, 'Fournisseur non défini', 'Ameublement', 'Table de Chevet', 2.000, 'unité', 5000.00, 10000.00, 0, 1, 5),
(84, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Parpaings 200mm', 120.000, 'unité', 35.00, 4200.00, 0, 1, 6),
(85, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Parpaing U 200mm', 60.000, 'unité', 60.00, 3600.00, 0, 1, 7),
(86, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Rocksand 0.2', 3.000, 'tonne', 970.00, 2910.00, 0, 1, 8),
(87, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Macadam ½', 2.000, 'tonne', 700.00, 1400.00, 0, 1, 9),
(88, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Transport', 1.000, 'forfait', 4500.00, 4500.00, 0, 1, 10),
(89, 3, 'Fournisseur non défini', 'Amélioration Fondations (Basiques -> Complètes)', 'Barres Y10', 1.000, 'forfait', 4500.00, 4500.00, 0, 1, 11);

-- --------------------------------------------------------

--
-- Table structure for table `pro_quotes`
--

CREATE TABLE `pro_quotes` (
  `id` int NOT NULL,
  `reference_number` varchar(50) NOT NULL,
  `contact_id` int DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT '',
  `customer_email` varchar(255) DEFAULT '',
  `customer_phone` varchar(50) DEFAULT '',
  `customer_address` text,
  `customer_message` text,
  `model_id` int NOT NULL,
  `model_name` varchar(255) NOT NULL,
  `model_type` varchar(20) DEFAULT 'container',
  `base_price` decimal(12,2) DEFAULT '0.00',
  `options_total` decimal(12,2) DEFAULT '0.00',
  `total_price` decimal(12,2) NOT NULL,
  `notes` text,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `valid_until` date DEFAULT NULL,
  `boq_requested` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_quotes`
--

INSERT INTO `pro_quotes` (`id`, `reference_number`, `contact_id`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `customer_message`, `model_id`, `model_name`, `model_type`, `base_price`, `options_total`, `total_price`, `notes`, `status`, `valid_until`, `boq_requested`, `created_at`, `updated_at`) VALUES
(1, 'PCQ-202603-000001', 1, 'test', 'test@test.com', '+2305654564', '', '', 19, 'Maison Conteneur - 2X20-1B', 'container', 1834275.00, 68934.45, 1903210.00, NULL, 'approved', '2026-04-01', 1, '2026-03-02 06:33:28', '2026-03-02 10:43:12'),
(2, 'PCQ-202603-000002', 1, 'test', 'test@test.com', '+2305654564', '', '', 19, 'Maison Conteneur - 2X20-1B', 'container', 1834275.00, 179564.45, 2013840.00, NULL, 'approved', '2026-04-01', 1, '2026-03-02 13:40:49', '2026-03-02 13:42:13'),
(3, 'PPQ-202603-000003', 1, 'test', 'test@test.com', '+2305654564', '', '', 14, 'Piscine Rectangulaire', 'pool', 490764.00, 370461.00, 861225.00, NULL, 'pending', '2026-04-01', 0, '2026-03-02 13:57:17', '2026-03-02 13:57:17');

-- --------------------------------------------------------

--
-- Table structure for table `pro_quote_options`
--

CREATE TABLE `pro_quote_options` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `option_id` int DEFAULT NULL,
  `option_name` varchar(500) NOT NULL,
  `option_price` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_quote_options`
--

INSERT INTO `pro_quote_options` (`id`, `quote_id`, `option_id`, `option_name`, `option_price`, `created_at`) VALUES
(1, 1, NULL, 'Amélioration Fondations (Basiques -> Complètes)', 68934.00, '2026-03-02 06:33:28'),
(2, 2, NULL, 'Amélioration Fondations (Basiques -> Complètes)', 68934.00, '2026-03-02 13:40:49'),
(3, 2, NULL, 'Ameublement', 110630.00, '2026-03-02 13:40:49'),
(4, 3, NULL, 'Éclairage', 32890.00, '2026-03-02 13:57:17'),
(5, 3, NULL, 'Filtration de Base', 77740.00, '2026-03-02 13:57:17'),
(6, 3, NULL, 'Carrelage', 131112.00, '2026-03-02 13:57:17'),
(7, 3, NULL, 'Marches de 60cm de large', 36329.00, '2026-03-02 13:57:17'),
(8, 3, NULL, 'Banc', 92391.00, '2026-03-02 13:57:17');

-- --------------------------------------------------------

--
-- Table structure for table `pro_schema_version`
--

CREATE TABLE `pro_schema_version` (
  `id` int NOT NULL DEFAULT '1',
  `version` varchar(20) NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_schema_version`
--

INSERT INTO `pro_schema_version` (`id`, `version`, `applied_at`) VALUES
(1, '1.6.0', '2026-03-02 08:09:20');

-- --------------------------------------------------------

--
-- Table structure for table `pro_settings`
--

CREATE TABLE `pro_settings` (
  `id` int NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `setting_group` varchar(50) DEFAULT 'general',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_settings`
--

INSERT INTO `pro_settings` (`id`, `setting_key`, `setting_value`, `setting_group`, `created_at`, `updated_at`) VALUES
(1, 'vat_rate', '15', 'general', '2026-03-01 17:35:52', '2026-03-02 14:08:58'),
(2, 'company_name', 'B-Creative', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(3, 'company_address', '', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(4, 'company_phone', '', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(5, 'company_email', '', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(6, 'vat_number', '', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(7, 'brn_number', '', 'company', '2026-03-01 17:35:52', '2026-03-02 03:23:04'),
(29, 'pdf_primary_color', '#000000', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(30, 'pdf_accent_color', '#f91515', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(31, 'pdf_footer_text', 'B-Creative Ltd – Grand Gaube, Mauritius | info@mrbcreativecontracting.com', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(32, 'pdf_terms', 'Ce devis est valable pour la durée indiquée. Les prix sont en MUR et hors TVA sauf mention contraire. Paiement selon conditions convenues.', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(33, 'pdf_bank_details', 'test coordonnées bancaires', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(34, 'pdf_validity_days', '30', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(35, 'pdf_show_logo', 'true', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(36, 'pdf_show_vat', 'true', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(37, 'pdf_show_bank_details', 'true', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(38, 'pdf_show_terms', 'true', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(39, 'pdf_template', '1', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(40, 'pdf_font', 'inter', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(41, 'pdf_logo_position', 'left', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(42, 'pdf_logo_offset_left', '0', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(43, 'pdf_logo_offset_right', '0', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(44, 'pdf_logo_offset_top', '0', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(45, 'pdf_logo_offset_bottom', '0', 'pdf', '2026-03-02 03:21:21', '2026-03-02 03:21:21'),
(46, 'smtp_host', 'mail.sunbox-mauritius.com', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(47, 'smtp_port', '465', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(48, 'smtp_user', 'email@sunbox-mauritius.com', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(49, 'smtp_password', '~Access1976~', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(50, 'smtp_secure', 'tls', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(51, 'smtp_from_email', 'info@sunbox-mauritius.com', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(52, 'smtp_from_name', 'Mr B-Creative Contracting ', 'email', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(57, 'admin_email', 'vmamet@sunbox-mauritius.com', 'notifications', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(58, 'cc_emails', '', 'notifications', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(59, 'send_admin_notifications', 'true', 'notifications', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(60, 'send_customer_confirmations', 'true', 'notifications', '2026-03-02 03:23:04', '2026-03-02 03:23:04'),
(64, 'site_under_construction', 'true', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58'),
(65, 'under_construction_message', 'WEBSITE UNDER CONSTRUCTION', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58'),
(66, 'site_logo', '', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58'),
(67, 'pdf_logo', '', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58'),
(68, 'site_slogan', 'Container home - Swimming-pools', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58'),
(70, 'dev_mode_no_password', 'false', 'site', '2026-03-02 03:27:28', '2026-03-02 14:08:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `pro_contacts`
--
ALTER TABLE `pro_contacts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pro_discounts`
--
ALTER TABLE `pro_discounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pro_email_signatures`
--
ALTER TABLE `pro_email_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_signature_key` (`signature_key`);

--
-- Indexes for table `pro_email_templates`
--
ALTER TABLE `pro_email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_template_key` (`template_key`);

--
-- Indexes for table `pro_purchase_reports`
--
ALTER TABLE `pro_purchase_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_id` (`quote_id`);

--
-- Indexes for table `pro_purchase_report_items`
--
ALTER TABLE `pro_purchase_report_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_id` (`report_id`);

--
-- Indexes for table `pro_quotes`
--
ALTER TABLE `pro_quotes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pro_quote_options`
--
ALTER TABLE `pro_quote_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `quote_id` (`quote_id`);

--
-- Indexes for table `pro_schema_version`
--
ALTER TABLE `pro_schema_version`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pro_settings`
--
ALTER TABLE `pro_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_setting_key` (`setting_key`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `pro_contacts`
--
ALTER TABLE `pro_contacts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pro_discounts`
--
ALTER TABLE `pro_discounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pro_email_signatures`
--
ALTER TABLE `pro_email_signatures`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pro_email_templates`
--
ALTER TABLE `pro_email_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pro_purchase_reports`
--
ALTER TABLE `pro_purchase_reports`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pro_purchase_report_items`
--
ALTER TABLE `pro_purchase_report_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `pro_quotes`
--
ALTER TABLE `pro_quotes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pro_quote_options`
--
ALTER TABLE `pro_quote_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `pro_settings`
--
ALTER TABLE `pro_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=153;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `pro_purchase_reports`
--
ALTER TABLE `pro_purchase_reports`
  ADD CONSTRAINT `pro_purchase_reports_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pro_purchase_report_items`
--
ALTER TABLE `pro_purchase_report_items`
  ADD CONSTRAINT `pro_purchase_report_items_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `pro_purchase_reports` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pro_quote_options`
--
ALTER TABLE `pro_quote_options`
  ADD CONSTRAINT `pro_quote_options_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `pro_quotes` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
