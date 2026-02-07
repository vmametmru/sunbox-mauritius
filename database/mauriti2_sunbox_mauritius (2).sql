-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 07, 2026 at 01:05 PM
-- Server version: 8.0.39-cll-lve
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mauriti2_sunbox_mauritius`
--

DELIMITER $$
--
-- Procedures
--
$$

$$

--
-- Functions
--
$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, NULL, 'model_created', 'model', 12, NULL, '102.115.92.19', '2025-12-24 03:54:11'),
(2, NULL, 'settings_bulk_updated', 'setting', NULL, NULL, '102.115.126.16', '2025-12-26 02:18:23'),
(3, NULL, 'settings_bulk_updated', 'setting', NULL, NULL, '102.115.126.16', '2025-12-26 02:18:27'),
(4, NULL, 'settings_bulk_updated', 'setting', NULL, NULL, '102.115.126.16', '2025-12-26 02:45:44'),
(5, NULL, 'settings_bulk_updated', 'setting', NULL, NULL, '102.115.126.16', '2025-12-26 02:48:34'),
(6, NULL, 'model_updated', 'model', 12, NULL, '102.115.126.16', '2025-12-26 08:27:43'),
(7, NULL, 'model_updated', 'model', 12, NULL, '102.115.2.20', '2026-01-02 04:16:00'),
(8, NULL, 'model_updated', 'model', 12, NULL, '102.115.2.20', '2026-01-02 04:16:42'),
(9, NULL, 'model_updated', 'model', 12, NULL, '102.115.2.20', '2026-01-02 04:17:01'),
(10, NULL, 'model_updated', 'model', 1, NULL, '102.115.2.20', '2026-01-02 04:17:45');

-- --------------------------------------------------------

--
-- Table structure for table `boq_categories`
--

CREATE TABLE `boq_categories` (
  `id` int NOT NULL,
  `model_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_option` tinyint(1) DEFAULT '0' COMMENT 'If true, this category appears as an option for the model',
  `image_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boq_categories`
--

INSERT INTO `boq_categories` (`id`, `model_id`, `name`, `is_option`, `image_id`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 12, 'Fondations Basiques', 1, NULL, 0, '2026-02-05 09:10:28', '2026-02-05 09:10:49'),
(2, 12, 'Structure', 0, NULL, 0, '2026-02-05 09:44:58', '2026-02-05 09:44:58'),
(3, 12, 'Ouvertures en Aluminium', 0, NULL, 0, '2026-02-05 10:29:13', '2026-02-05 10:29:13'),
(4, 12, 'Electricité', 0, NULL, 0, '2026-02-05 10:36:51', '2026-02-05 10:36:51'),
(5, 12, 'Ouvertures en Bois', 0, NULL, 0, '2026-02-05 10:48:04', '2026-02-05 10:48:04'),
(6, 12, 'Revêtement des Sols', 0, NULL, 0, '2026-02-05 10:49:02', '2026-02-05 10:49:02'),
(7, 12, 'Transport', 0, NULL, 0, '2026-02-05 10:53:01', '2026-02-05 10:53:01'),
(8, 12, 'Amélioration Fondations (Basiques -> Complètes)', 1, NULL, 0, '2026-02-05 15:24:10', '2026-02-05 15:24:10'),
(9, 12, 'Amélioration du Toit (1 pente -> 2 pentes)', 1, NULL, 0, '2026-02-05 15:32:53', '2026-02-05 15:32:53');

-- --------------------------------------------------------

--
-- Table structure for table `boq_lines`
--

CREATE TABLE `boq_lines` (
  `id` int NOT NULL,
  `category_id` int NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unité' COMMENT 'Unit of measure (unité, m², m³, kg, etc.)',
  `unit_cost_ht` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Unit cost excluding tax',
  `supplier_id` int DEFAULT NULL,
  `margin_percent` decimal(5,2) NOT NULL DEFAULT '30.00' COMMENT 'Margin percentage, default 30%',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boq_lines`
--

INSERT INTO `boq_lines` (`id`, `category_id`, `description`, `quantity`, `unit`, `unit_cost_ht`, `supplier_id`, `margin_percent`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 1, 'Location d\'un JCB (1 jour)', 1.0000, 'jour', 10000.00, NULL, 30.00, 0, '2026-02-05 09:25:18', '2026-02-05 09:36:22'),
(2, 1, 'Main d\'oeuvre', 6.0000, 'jour', 7500.00, NULL, 30.00, 0, '2026-02-05 09:28:36', '2026-02-05 09:36:34'),
(3, 1, 'Ciment', 15.0000, 'unité', 180.00, NULL, 30.00, 0, '2026-02-05 09:38:02', '2026-02-05 09:38:02'),
(4, 1, 'Rocksand', 3.0000, 'tonne', 970.00, NULL, 30.00, 0, '2026-02-05 09:39:01', '2026-02-05 09:39:01'),
(5, 1, 'Macadam', 3.0000, 'tonne', 650.00, NULL, 30.00, 0, '2026-02-05 09:39:25', '2026-02-05 09:39:25'),
(6, 1, 'Transport', 1.0000, 'unité', 4500.00, NULL, 30.00, 0, '2026-02-05 09:39:54', '2026-02-05 09:39:54'),
(7, 1, 'Evacuation du surplus de terre et roches', 1.0000, 'unité', 4500.00, NULL, 30.00, 0, '2026-02-05 09:40:34', '2026-02-05 09:40:34'),
(8, 2, '1 x Containeur de 6m reconditionné, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), Toit d\'une seule pente en Tole avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 1.0000, 'unité', 395000.00, NULL, 30.00, 0, '2026-02-05 09:47:15', '2026-02-05 15:32:14'),
(9, 3, '1 x Porte Coullissante 2000mm', 1.0000, 'unité', 42000.00, NULL, 30.00, 0, '2026-02-05 10:29:50', '2026-02-05 10:36:16'),
(10, 3, '1 x Fenêtre dans la salle de bain 500mm x 500mm', 1.0000, 'unité', 4000.00, NULL, 30.00, 0, '2026-02-05 10:30:12', '2026-02-05 10:35:01'),
(11, 3, '1 x Fenêtre dans la cuisine 500mm x 1100mm', 2.0000, 'unité', 15000.00, NULL, 30.00, 0, '2026-02-05 10:30:42', '2026-02-05 10:30:42'),
(12, 4, 'Panneau électrique', 1.0000, 'unité', 2000.00, NULL, 30.00, 0, '2026-02-05 10:37:16', '2026-02-05 10:37:16'),
(13, 4, 'Breakers', 4.0000, 'unité', 600.00, NULL, 30.00, 0, '2026-02-05 10:38:22', '2026-02-05 10:38:22'),
(14, 4, 'RCD 63A', 1.0000, 'unité', 2500.00, NULL, 30.00, 0, '2026-02-05 10:38:42', '2026-02-05 10:38:42'),
(15, 4, 'Isolateur 63A', 1.0000, 'unité', 2000.00, NULL, 30.00, 0, '2026-02-05 10:38:58', '2026-02-05 10:38:58'),
(16, 4, 'Lumieres Plafond', 3.0000, 'unité', 300.00, NULL, 30.00, 0, '2026-02-05 10:39:50', '2026-02-05 10:39:50'),
(17, 4, 'Prises Doubles', 4.0000, 'unité', 900.00, NULL, 30.00, 0, '2026-02-05 10:40:38', '2026-02-05 10:40:38'),
(18, 4, 'Prise 16A', 1.0000, 'unité', 600.00, NULL, 30.00, 0, '2026-02-05 10:40:59', '2026-02-05 10:40:59'),
(19, 4, 'Prise Etanche 16A', 1.0000, 'unité', 1500.00, NULL, 30.00, 0, '2026-02-05 10:41:27', '2026-02-05 10:41:27'),
(20, 4, 'Fils Electriques', 1.0000, 'forfait', 10000.00, NULL, 30.00, 0, '2026-02-05 10:41:54', '2026-02-05 10:47:40'),
(21, 4, 'Electricien', 1.0000, 'forfait', 20000.00, 3, 30.00, 0, '2026-02-05 10:42:40', '2026-02-05 10:42:40'),
(22, 5, 'Porte en bois de 750mm pour la salle de bain', 1.0000, 'unité', 22000.00, NULL, 30.00, 0, '2026-02-05 10:48:26', '2026-02-05 10:48:26'),
(23, 6, 'Couche de béton autonivellant (1 a 8mm)', 15.0000, 'm²', 1500.00, NULL, 30.00, 0, '2026-02-05 10:49:57', '2026-02-05 10:50:18'),
(24, 6, 'Main d\'Oeuvre (Béton et SPC)', 4.0000, 'jour', 2500.00, 4, 30.00, 0, '2026-02-05 10:50:48', '2026-02-05 10:52:19'),
(25, 6, 'SPC & Plynthes (inc Installation)', 15.0000, 'm²', 1200.00, NULL, 30.00, 0, '2026-02-05 10:51:47', '2026-02-05 10:56:32'),
(26, 7, 'Camion Conteneur', 2.0000, 'unité', 12500.00, NULL, 30.00, 0, '2026-02-05 10:53:36', '2026-02-05 10:53:36'),
(27, 8, 'Parpaings 200mm', 120.0000, 'unité', 35.00, NULL, 30.00, 0, '2026-02-05 15:27:06', '2026-02-05 15:27:06'),
(28, 8, 'Parpaing U 200mm', 60.0000, 'unité', 50.00, NULL, 30.00, 0, '2026-02-05 15:27:39', '2026-02-05 15:27:39'),
(29, 8, 'Rocksand 0.2', 3.0000, 'tonne', 970.00, NULL, 30.00, 0, '2026-02-05 15:28:17', '2026-02-05 15:28:17'),
(30, 8, 'Macadam ½', 2.0000, 'tonne', 650.00, NULL, 30.00, 0, '2026-02-05 15:28:52', '2026-02-05 15:29:04'),
(31, 8, 'Transport', 1.0000, 'forfait', 4500.00, NULL, 30.00, 0, '2026-02-05 15:29:23', '2026-02-05 15:29:23'),
(32, 8, 'Main d\'Oeuvre', 5.0000, 'jour', 5000.00, 2, 30.00, 0, '2026-02-05 15:30:42', '2026-02-05 15:30:42'),
(33, 9, 'Structure en métal, Tole, Main d\'Oeuvre, Peinture, Traitement anti-rouille et Transport', 1.0000, 'forfait', 20000.00, NULL, 30.00, 0, '2026-02-05 15:34:12', '2026-02-05 15:34:12');

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('new','read','replied','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `models`
--

CREATE TABLE `models` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('container','pool') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `base_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `surface_m2` float DEFAULT '0',
  `bedrooms` int DEFAULT '0',
  `bathrooms` int DEFAULT '0',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_image_url` text COLLATE utf8mb4_unicode_ci,
  `features` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `container_20ft_count` int DEFAULT '0',
  `container_40ft_count` int DEFAULT '0',
  `pool_shape` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `has_overflow` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `models`
--

INSERT INTO `models` (`id`, `name`, `type`, `description`, `base_price`, `surface_m2`, `bedrooms`, `bathrooms`, `image_url`, `plan_image_url`, `features`, `is_active`, `display_order`, `created_at`, `updated_at`, `container_20ft_count`, `container_40ft_count`, `pool_shape`, `has_overflow`) VALUES
(1, 'Tiny House 1C201B', 'container', 'Studio compact idéal pour un bureau ou un espace de vie minimaliste. Design moderne et fonctionnel.', 850000.00, 0, 0, 1, '/uploads/models/52c17914eb09482678cb1430c1a27223.jpg', NULL, '[\"Isolation thermique\", \"Électricité complète\", \"Climatisation pré-installée\", \"Fenêtres double vitrage\"]', 1, 1, '2025-12-18 09:43:18', '2026-01-02 04:17:45', 0, 0, NULL, 0),
(2, 'T1 Standard 20\'', 'container', 'Appartement T1 confortable avec coin cuisine séparé. Parfait pour une personne ou un couple.', 1200000.00, 0, 1, 1, NULL, NULL, '[\"Cuisine équipée\", \"Salle de bain complète\", \"Isolation renforcée\", \"Terrasse optionnelle\"]', 1, 2, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(3, 'T2 Confort 40\'', 'container', 'Appartement T2 spacieux avec salon séparé. Idéal pour une petite famille.', 1850000.00, 0, 2, 1, NULL, NULL, '[\"Grande cuisine\", \"Salon lumineux\", \"2 chambres\", \"Rangements intégrés\"]', 1, 3, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(4, 'T3 Family 40\' HC', 'container', 'Maison T3 haute de plafond pour un confort optimal. Espace généreux pour toute la famille.', 2500000.00, 0, 3, 2, NULL, NULL, '[\"Hauteur sous plafond 2.7m\", \"2 salles de bain\", \"Cuisine américaine\", \"Terrasse couverte\"]', 1, 4, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(5, 'Villa Duplex', 'container', 'Villa sur deux niveaux combinant 2 containers. Le summum du confort container.', 4200000.00, 0, 3, 2, NULL, NULL, '[\"2 niveaux\", \"Escalier design\", \"Rooftop aménageable\", \"Vue panoramique\"]', 1, 5, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(6, 'Bureau Pro 20\'', 'container', 'Espace de travail professionnel clé en main. Idéal pour startups et freelances.', 950000.00, 0, 0, 1, NULL, NULL, '[\"Câblage réseau\", \"Climatisation\", \"Éclairage LED\", \"Isolation acoustique\"]', 1, 6, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(7, 'Mini Pool 4m', 'pool', 'Piscine compacte idéale pour les petits espaces. Rafraîchissement garanti.', 450000.00, 0, 0, 0, NULL, NULL, '[\"Structure acier\", \"Liner premium\", \"Filtration incluse\", \"Escalier intégré\"]', 1, 1, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(8, 'Family Pool 6m', 'pool', 'Piscine familiale de taille moyenne. Parfaite pour les baignades en famille.', 750000.00, 0, 0, 0, NULL, NULL, '[\"Nage à contre-courant optionnelle\", \"Éclairage LED\", \"Plage immergée\", \"Filtration automatique\"]', 1, 2, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(9, 'Sport Pool 8m', 'pool', 'Grande piscine pour les nageurs. Longueur idéale pour l\'exercice.', 1100000.00, 0, 0, 0, NULL, NULL, '[\"Couloir de nage\", \"Nage à contre-courant\", \"Chauffage solaire\", \"Couverture automatique\"]', 1, 3, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(10, 'Luxury Pool 10m', 'pool', 'Piscine de luxe avec toutes les options. Pour les espaces généreux.', 1650000.00, 0, 0, 0, NULL, NULL, '[\"Design sur mesure\", \"Cascade décorative\", \"Spa intégré\", \"Domotique complète\"]', 1, 4, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(11, 'Plunge Pool', 'pool', 'Bassin de plongée compact et profond. Idéal pour se rafraîchir.', 380000.00, 0, 0, 0, NULL, NULL, '[\"Profondeur 1.5m\", \"Jets massants\", \"Compact\", \"Installation rapide\"]', 1, 5, '2025-12-18 09:43:18', '2025-12-18 09:43:18', 0, 0, NULL, 0),
(12, 'Studio 1C201B', 'container', '15m2 - 1 Chambre - 1 Cuisine - 1 x Conteneur de 20\'', 850000.00, 15, 1, 1, '/uploads/models/fe09c14c95847e6aa2fa8af50d767961.jpg', NULL, '[\"ligne 1\", \"ligne 2\", \"ligne 3\"]', 1, 0, '2025-12-24 03:54:11', '2026-02-07 05:15:56', 1, 0, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `model_images`
--

CREATE TABLE `model_images` (
  `id` int NOT NULL,
  `model_id` int NOT NULL,
  `media_type` enum('photo','plan','bandeau') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'photo',
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `model_images`
--

INSERT INTO `model_images` (`id`, `model_id`, `media_type`, `file_path`, `is_primary`, `sort_order`, `created_at`) VALUES
(2, 12, 'photo', 'uploads/models/fe09c14c95847e6aa2fa8af50d767961.jpg', 1, 0, '2026-01-02 03:44:31'),
(3, 1, 'photo', 'uploads/models/52c17914eb09482678cb1430c1a27223.jpg', 1, 0, '2026-01-02 03:46:11'),
(4, 12, 'photo', 'uploads/models/c5fe95c5747d7a31849600cb58ba6fb1.jpg', 0, 0, '2026-01-07 16:40:44'),
(5, 12, 'plan', 'uploads/models/f50e419ad4d6232247c86d88925801a0.jpg', 0, 0, '2026-01-07 16:41:06'),
(8, 0, 'bandeau', 'uploads/models/51ab16a80418811589529253fffb64fa.jpg', 0, 0, '2026-01-07 18:03:46'),
(9, 0, 'bandeau', 'uploads/models/2c96d60f67ea4670c8c927421e9594d2.jpg', 0, 0, '2026-01-07 18:05:22'),
(10, 0, 'bandeau', 'uploads/models/1fa4f3510a74013ec5fa34518154965b.jpg', 0, 0, '2026-01-07 18:06:09'),
(11, 0, 'bandeau', 'uploads/models/1534b13e3ab623541b7e3ffcb65fe674.jpg', 0, 0, '2026-01-07 18:07:46'),
(12, 1, 'plan', 'uploads/models/f354b99f0e8e4d81f89751b56c5be91e.jpg', 0, 0, '2026-01-11 07:23:04'),
(13, 0, 'bandeau', 'uploads/models/465c80bfdae10040c2df276e342682ad.jpg', 0, 0, '2026-01-22 09:12:17'),
(14, 0, 'bandeau', 'uploads/models/60f5ab1896c6c36ef27ffab17a4de62e.jpg', 0, 0, '2026-01-22 09:12:36'),
(15, 0, '', 'uploads/models/f498cb415ddb90b636f5110a45111b3c.jpg', 0, 0, '2026-02-05 16:03:15'),
(16, 0, '', 'uploads/models/589f4e8153eb6148cb5da7615282ebf2.jpg', 0, 0, '2026-02-07 05:24:59');

-- --------------------------------------------------------

--
-- Table structure for table `model_options`
--

CREATE TABLE `model_options` (
  `id` int NOT NULL,
  `model_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `model_options`
--

INSERT INTO `model_options` (`id`, `model_id`, `category_id`, `name`, `description`, `price`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 1, 6, 'Bardage bois extérieur', 'Habillage extérieur en bois traité', 85000.00, 1, 1, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(2, 1, 6, 'Peinture premium extérieure', 'Peinture haute qualité résistante UV', 45000.00, 1, 2, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(3, 1, 6, 'Parquet stratifié', 'Sol en parquet stratifié haute résistance', 65000.00, 1, 3, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(4, 1, 6, 'Carrelage sol complet', 'Carrelage céramique pose complète', 75000.00, 1, 4, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(5, 1, 3, 'Panneau solaire 3kW', 'Installation solaire avec batteries', 180000.00, 1, 5, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(6, 1, 3, 'Panneau solaire 5kW', 'Installation solaire grande capacité', 280000.00, 1, 6, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(7, 1, 3, 'Éclairage LED complet', 'Spots et rubans LED dans toutes les pièces', 35000.00, 1, 7, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(8, 1, 3, 'Prises USB intégrées', 'Prises avec ports USB dans chaque pièce', 15000.00, 1, 8, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(10, 1, 2, 'Climatisation split 12000 BTU', 'Clim puissance moyenne', 28000.00, 1, 10, '2026-01-08 02:47:47', '2026-01-11 06:13:10'),
(12, 1, 7, 'Chauffe-eau solaire 150L', 'Eau chaude solaire économique', 65000.00, 1, 12, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(13, 1, 7, 'Chauffe-eau solaire 200L', 'Eau chaude solaire grande capacité', 85000.00, 1, 13, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(14, 1, 7, 'Récupération eau de pluie', 'Système de récupération 1000L', 20000.00, 1, 14, '2026-01-08 02:47:47', '2026-01-11 06:13:36'),
(15, 1, 8, 'Alarme connectée', 'Système d\'alarme avec app mobile', 55000.00, 1, 15, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(16, 1, 8, 'Caméras de surveillance', '4 caméras HD avec enregistrement', 75000.00, 1, 16, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(17, 1, 8, 'Barrière de Sécurité', 'Barrière de Sécurité (Trellidor)', 55000.00, 1, 17, '2026-01-08 02:47:47', '2026-01-11 06:14:30'),
(18, 1, 5, 'Terrasse bois 15m²', 'Terrasse en bois composite', 120000.00, 1, 18, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(21, 1, 5, 'Aménagement jardin', 'Création espace vert complet', 150000.00, 1, 21, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(25, 1, 4, 'Éclairage LED piscine', 'Spots LED subaquatiques RGB', 45000.00, 1, 25, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(26, 1, 4, 'Robot nettoyeur', 'Robot de nettoyage automatique', 85000.00, 1, 26, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(27, 1, 1, 'Couverture automatique', 'Bâche de sécurité motorisée', 195000.00, 1, 27, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(28, 1, 1, 'Douche solaire', 'Douche extérieure solaire', 25000.00, 1, 28, '2026-01-08 02:47:47', '2026-01-08 02:47:47');

-- --------------------------------------------------------

--
-- Table structure for table `option_categories`
--

CREATE TABLE `option_categories` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `option_categories`
--

INSERT INTO `option_categories` (`id`, `name`, `description`, `image_id`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'Accessoires', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(2, 'Climatisation', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(3, 'Électricité', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(4, 'Équipements', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(5, 'Extérieur', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(6, 'Finitions', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(7, 'Plomberie', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47'),
(8, 'Sécurité', '', NULL, 0, '2026-01-08 02:47:47', '2026-01-08 02:47:47');

-- --------------------------------------------------------

--
-- Table structure for table `quotes`
--

CREATE TABLE `quotes` (
  `id` int NOT NULL,
  `reference_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` int DEFAULT NULL,
  `model_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_type` enum('container','pool') COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_price` decimal(12,2) DEFAULT '0.00',
  `options_total` decimal(12,2) DEFAULT '0.00',
  `total_price` decimal(12,2) NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_address` text COLLATE utf8mb4_unicode_ci,
  `customer_message` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `valid_until` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `assigned_to` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_options`
--

CREATE TABLE `quote_options` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `option_id` int DEFAULT NULL,
  `option_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int NOT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `setting_group` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `setting_group`, `description`, `created_at`, `updated_at`) VALUES
(1, 'smtp_host', 'smtp.gmail.com', 'email', 'Serveur SMTP', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(2, 'smtp_port', '465', 'email', 'Port SMTP', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(3, 'smtp_user', 'vmamet@mamba-online.com', 'email', 'Utilisateur SMTP', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(4, 'smtp_password', 'apyv vzpc srcy ozss', 'email', 'Mot de passe SMTP', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(5, 'smtp_secure', 'ssl', 'email', 'Connexion sécurisée', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(6, 'smtp_from', '', 'email', 'Adresse expéditeur', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(7, 'company_name', 'Sunbox Ltd', 'company', 'Nom de l\'entreprise', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(8, 'company_email', 'info@sunbox-mauritius.com', 'company', 'Email de contact', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(9, 'company_phone', '+230 52544544 / +230 54221025', 'company', 'Téléphone', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(10, 'company_address', 'Grand Baie, Mauritius', 'company', 'Adresse', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(11, 'admin_email', '', 'notifications', 'Email administrateur', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(12, 'send_admin_notifications', 'true', 'notifications', 'Envoyer notifications admin', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(13, 'send_customer_confirmations', 'true', 'notifications', 'Envoyer confirmations client', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(14, 'quote_validity_days', '30', 'general', 'Validité des devis en jours', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(15, 'currency', 'MUR', 'general', 'Devise', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(16, 'currency_symbol', 'Rs', 'general', 'Symbole devise', '2025-12-18 09:43:18', '2026-02-05 15:21:05'),
(17, 'site_title', 'Sunbox Mauritius', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(18, 'meta_keywords', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(19, 'meta_robots', 'index,follow', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(20, 'canonical_url', 'https://sunbox-mauritius.com/', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(21, 'logo_url', '/uploads/site/logo-20251224-040305.jpg', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(22, 'favicon_url', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(23, 'og_title', 'Sunbox Mauritius', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(24, 'og_description', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(25, 'og_image', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(26, 'twitter_image', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-05 15:21:05'),
(27, 'site_under_construction', 'true', 'site', NULL, '2025-12-26 02:18:23', '2026-02-05 15:21:05'),
(28, 'under_construction_message', '🚧 Page en construction — merci de revenir ultérieurement. | Page under construction - please come back later', 'site', NULL, '2025-12-26 02:18:23', '2026-02-05 15:21:05'),
(36, 'smtp_from_email', 'vmamet@sunbox-mauritius.com', 'email', NULL, '2025-12-26 02:45:44', '2026-02-05 15:21:05'),
(37, 'smtp_from_name', 'Sunbox Ltd', 'email', NULL, '2025-12-26 02:45:44', '2026-02-05 15:21:05'),
(43, 'cc_emails', '', 'notifications', NULL, '2025-12-26 02:45:44', '2026-02-05 15:21:05'),
(95, 'site_logo', '/uploads/logo-menu.jpg', 'site', NULL, '2026-01-07 13:21:23', '2026-02-05 15:21:05'),
(96, 'pdf_logo', '/uploads/logo-pdf.jpg', 'site', NULL, '2026-01-07 13:21:23', '2026-02-05 15:21:05'),
(97, 'site_slogan', 'container home - swimming-pools', 'site', NULL, '2026-01-07 13:21:23', '2026-02-05 15:21:05');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `city`, `phone`, `email`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Quincaillerie Tigode', 'Cote D\'Or', '+230 123 4567', 'contact@fournisseur.mu', 1, '2026-02-05 09:06:53', '2026-02-05 13:07:05'),
(2, 'Charlie Jacquelin', 'Port Louis', '+230 234 5678', 'info@abc-construction.mu', 1, '2026-02-05 09:06:53', '2026-02-05 09:08:13'),
(3, 'Owen Antoine', 'Grand Gaube', '+230 345 6789', 'elec@plus.mu', 1, '2026-02-05 09:06:53', '2026-02-05 09:08:40'),
(4, 'Jean Eric Basraz', 'Grand Gaube', '+230 456 7890', 'contact@plomberiepro.mu', 1, '2026-02-05 09:06:53', '2026-02-05 09:09:52'),
(5, 'Medlog', 'Riche Terre', '', '', 1, '2026-02-05 09:10:05', '2026-02-05 09:10:05');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','manager','sales') COLLATE utf8mb4_unicode_ci DEFAULT 'sales',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin@sunbox-mauritius.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrateur', 'admin', 1, NULL, '2025-12-18 09:43:18', '2025-12-18 09:43:18');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_boq_category_totals`
-- (See below for the actual view)
--
CREATE TABLE `v_boq_category_totals` (
`category_id` int
,`model_id` int
,`category_name` varchar(255)
,`is_option` tinyint(1)
,`display_order` int
,`total_cost_ht` decimal(43,2)
,`total_sale_price_ht` decimal(47,2)
,`total_profit_ht` decimal(48,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_boq_lines_with_calculations`
-- (See below for the actual view)
--
CREATE TABLE `v_boq_lines_with_calculations` (
`id` int
,`category_id` int
,`description` varchar(500)
,`quantity` decimal(12,4)
,`unit` varchar(50)
,`unit_cost_ht` decimal(12,2)
,`supplier_id` int
,`margin_percent` decimal(5,2)
,`display_order` int
,`created_at` timestamp
,`updated_at` timestamp
,`supplier_name` varchar(255)
,`category_name` varchar(255)
,`model_id` int
,`is_option` tinyint(1)
,`total_cost_ht` decimal(21,2)
,`sale_price_ht` decimal(25,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_model_boq_base_price`
-- (See below for the actual view)
--
CREATE TABLE `v_model_boq_base_price` (
`model_id` int
,`calculated_base_price_ht` decimal(65,2)
,`total_cost_ht` decimal(65,2)
,`total_profit_ht` decimal(65,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_model_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_model_stats` (
`id` int
,`name` varchar(255)
,`type` enum('container','pool')
,`base_price` decimal(12,2)
,`quote_count` bigint
,`total_revenue` decimal(34,2)
,`avg_quote_value` decimal(16,6)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_quotes_details`
-- (See below for the actual view)
--
CREATE TABLE `v_quotes_details` (
`id` int
,`reference_number` varchar(50)
,`model_id` int
,`model_name` varchar(255)
,`model_type` enum('container','pool')
,`base_price` decimal(12,2)
,`options_total` decimal(12,2)
,`total_price` decimal(12,2)
,`customer_name` varchar(255)
,`customer_email` varchar(255)
,`customer_phone` varchar(50)
,`customer_address` text
,`customer_message` text
,`status` enum('pending','approved','rejected','completed')
,`valid_until` date
,`notes` text
,`assigned_to` int
,`created_at` timestamp
,`updated_at` timestamp
,`model_display_name` varchar(255)
,`model_display_type` enum('container','pool')
,`assigned_user_name` varchar(255)
,`options_count` bigint
,`options_list` mediumtext
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `boq_categories`
--
ALTER TABLE `boq_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_model_id` (`model_id`),
  ADD KEY `idx_is_option` (`is_option`),
  ADD KEY `idx_display_order` (`display_order`),
  ADD KEY `fk_boq_categories_image` (`image_id`);

--
-- Indexes for table `boq_lines`
--
ALTER TABLE `boq_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_display_order` (`display_order`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `models`
--
ALTER TABLE `models`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `model_images`
--
ALTER TABLE `model_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `idx_model_media_primary` (`model_id`,`media_type`,`is_primary`);

--
-- Indexes for table `model_options`
--
ALTER TABLE `model_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `option_categories`
--
ALTER TABLE `option_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_option_categories_image` (`image_id`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `idx_reference` (`reference_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_customer_email` (`customer_email`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `quote_options`
--
ALTER TABLE `quote_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote_id` (`quote_id`),
  ADD KEY `quote_options_model_option_fk` (`option_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `idx_key` (`setting_key`),
  ADD KEY `idx_group` (`setting_group`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `boq_categories`
--
ALTER TABLE `boq_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `boq_lines`
--
ALTER TABLE `boq_lines`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `models`
--
ALTER TABLE `models`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `model_images`
--
ALTER TABLE `model_images`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `model_options`
--
ALTER TABLE `model_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `option_categories`
--
ALTER TABLE `option_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quote_options`
--
ALTER TABLE `quote_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=132;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------

--
-- Structure for view `v_boq_category_totals`
--
DROP TABLE IF EXISTS `v_boq_category_totals`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_boq_category_totals`  AS SELECT `bc`.`id` AS `category_id`, `bc`.`model_id` AS `model_id`, `bc`.`name` AS `category_name`, `bc`.`is_option` AS `is_option`, `bc`.`display_order` AS `display_order`, coalesce(sum(round((`bl`.`quantity` * `bl`.`unit_cost_ht`),2)),0) AS `total_cost_ht`, coalesce(sum(round(((`bl`.`quantity` * `bl`.`unit_cost_ht`) * (1 + (`bl`.`margin_percent` / 100))),2)),0) AS `total_sale_price_ht`, (coalesce(sum(round(((`bl`.`quantity` * `bl`.`unit_cost_ht`) * (1 + (`bl`.`margin_percent` / 100))),2)),0) - coalesce(sum(round((`bl`.`quantity` * `bl`.`unit_cost_ht`),2)),0)) AS `total_profit_ht` FROM (`boq_categories` `bc` left join `boq_lines` `bl` on((`bc`.`id` = `bl`.`category_id`))) GROUP BY `bc`.`id`, `bc`.`model_id`, `bc`.`name`, `bc`.`is_option`, `bc`.`display_order` ORDER BY `bc`.`display_order` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_boq_lines_with_calculations`
--
DROP TABLE IF EXISTS `v_boq_lines_with_calculations`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_boq_lines_with_calculations`  AS SELECT `bl`.`id` AS `id`, `bl`.`category_id` AS `category_id`, `bl`.`description` AS `description`, `bl`.`quantity` AS `quantity`, `bl`.`unit` AS `unit`, `bl`.`unit_cost_ht` AS `unit_cost_ht`, `bl`.`supplier_id` AS `supplier_id`, `bl`.`margin_percent` AS `margin_percent`, `bl`.`display_order` AS `display_order`, `bl`.`created_at` AS `created_at`, `bl`.`updated_at` AS `updated_at`, `s`.`name` AS `supplier_name`, `bc`.`name` AS `category_name`, `bc`.`model_id` AS `model_id`, `bc`.`is_option` AS `is_option`, round((`bl`.`quantity` * `bl`.`unit_cost_ht`),2) AS `total_cost_ht`, round(((`bl`.`quantity` * `bl`.`unit_cost_ht`) * (1 + (`bl`.`margin_percent` / 100))),2) AS `sale_price_ht` FROM ((`boq_lines` `bl` join `boq_categories` `bc` on((`bl`.`category_id` = `bc`.`id`))) left join `suppliers` `s` on((`bl`.`supplier_id` = `s`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_model_boq_base_price`
--
DROP TABLE IF EXISTS `v_model_boq_base_price`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_model_boq_base_price`  AS SELECT `v_boq_category_totals`.`model_id` AS `model_id`, sum(`v_boq_category_totals`.`total_sale_price_ht`) AS `calculated_base_price_ht`, sum(`v_boq_category_totals`.`total_cost_ht`) AS `total_cost_ht`, sum(`v_boq_category_totals`.`total_profit_ht`) AS `total_profit_ht` FROM `v_boq_category_totals` WHERE (`v_boq_category_totals`.`is_option` = false) GROUP BY `v_boq_category_totals`.`model_id` ;

-- --------------------------------------------------------

--
-- Structure for view `v_model_stats`
--
DROP TABLE IF EXISTS `v_model_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_model_stats`  AS SELECT `m`.`id` AS `id`, `m`.`name` AS `name`, `m`.`type` AS `type`, `m`.`base_price` AS `base_price`, count(`q`.`id`) AS `quote_count`, coalesce(sum(`q`.`total_price`),0) AS `total_revenue`, avg(`q`.`total_price`) AS `avg_quote_value` FROM (`models` `m` left join `quotes` `q` on((`q`.`model_id` = `m`.`id`))) GROUP BY `m`.`id`, `m`.`name`, `m`.`type`, `m`.`base_price` ;

-- --------------------------------------------------------

--
-- Structure for view `v_quotes_details`
--
DROP TABLE IF EXISTS `v_quotes_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_quotes_details`  AS SELECT `q`.`id` AS `id`, `q`.`reference_number` AS `reference_number`, `q`.`model_id` AS `model_id`, `q`.`model_name` AS `model_name`, `q`.`model_type` AS `model_type`, `q`.`base_price` AS `base_price`, `q`.`options_total` AS `options_total`, `q`.`total_price` AS `total_price`, `q`.`customer_name` AS `customer_name`, `q`.`customer_email` AS `customer_email`, `q`.`customer_phone` AS `customer_phone`, `q`.`customer_address` AS `customer_address`, `q`.`customer_message` AS `customer_message`, `q`.`status` AS `status`, `q`.`valid_until` AS `valid_until`, `q`.`notes` AS `notes`, `q`.`assigned_to` AS `assigned_to`, `q`.`created_at` AS `created_at`, `q`.`updated_at` AS `updated_at`, `m`.`name` AS `model_display_name`, `m`.`type` AS `model_display_type`, `u`.`name` AS `assigned_user_name`, (select count(0) from `quote_options` where (`quote_options`.`quote_id` = `q`.`id`)) AS `options_count`, (select group_concat(`quote_options`.`option_name` separator ', ') from `quote_options` where (`quote_options`.`quote_id` = `q`.`id`)) AS `options_list` FROM ((`quotes` `q` left join `models` `m` on((`q`.`model_id` = `m`.`id`))) left join `users` `u` on((`q`.`assigned_to` = `u`.`id`))) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `boq_categories`
--
ALTER TABLE `boq_categories`
  ADD CONSTRAINT `boq_categories_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_boq_categories_image` FOREIGN KEY (`image_id`) REFERENCES `model_images` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `boq_lines`
--
ALTER TABLE `boq_lines`
  ADD CONSTRAINT `boq_lines_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `boq_categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `boq_lines_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `model_options`
--
ALTER TABLE `model_options`
  ADD CONSTRAINT `model_options_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `model_options_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `option_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `option_categories`
--
ALTER TABLE `option_categories`
  ADD CONSTRAINT `fk_option_categories_image` FOREIGN KEY (`image_id`) REFERENCES `model_images` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quote_options`
--
ALTER TABLE `quote_options`
  ADD CONSTRAINT `quote_options_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quote_options_model_option_fk` FOREIGN KEY (`option_id`) REFERENCES `model_options` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
