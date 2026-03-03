-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 03, 2026 at 04:23 AM
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
  `parent_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_option` tinyint(1) DEFAULT '0' COMMENT 'If true, this category appears as an option for the model',
  `qty_editable` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, quantity is editable on the public configurator',
  `image_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boq_categories`
--

INSERT INTO `boq_categories` (`id`, `model_id`, `parent_id`, `name`, `is_option`, `qty_editable`, `image_id`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 12, NULL, 'Fondations Basiques', 1, 0, 18, 0, '2026-02-05 09:10:28', '2026-02-07 12:25:55'),
(2, 12, NULL, 'Structure', 0, 0, NULL, 0, '2026-02-05 09:44:58', '2026-02-05 09:44:58'),
(3, 12, NULL, 'Ouvertures en Aluminium', 0, 0, NULL, 0, '2026-02-05 10:29:13', '2026-02-05 10:29:13'),
(4, 12, NULL, 'Electricité', 0, 0, NULL, 0, '2026-02-05 10:36:51', '2026-02-14 03:38:27'),
(5, 12, NULL, 'Ouvertures en Bois', 0, 0, NULL, 0, '2026-02-05 10:48:04', '2026-02-05 10:48:04'),
(6, 12, NULL, 'Revêtement des Sols', 0, 0, NULL, 0, '2026-02-05 10:49:02', '2026-02-05 10:49:02'),
(7, 12, NULL, 'Transport', 0, 0, NULL, 0, '2026-02-05 10:53:01', '2026-02-05 10:53:01'),
(8, 12, NULL, 'Amélioration Fondations (Basiques -> Complètes)', 1, 0, 19, 0, '2026-02-05 15:24:10', '2026-02-07 13:35:44'),
(9, 12, NULL, 'Amélioration du Toit (1 pente -> 2 pentes)', 1, 0, 21, 0, '2026-02-05 15:32:53', '2026-02-07 13:40:08'),
(10, 12, NULL, 'Ameublement', 1, 0, 22, 0, '2026-02-07 13:41:34', '2026-02-07 13:43:06'),
(11, 12, NULL, 'Circuit Sanitaire', 1, 0, 23, 0, '2026-02-07 13:48:00', '2026-02-07 13:49:38'),
(12, 12, NULL, 'Meubles de Cuisine', 1, 0, 24, 0, '2026-02-07 14:05:39', '2026-02-07 14:06:01'),
(13, 12, NULL, 'Equipements Electro', 1, 0, 25, 0, '2026-02-07 16:15:54', '2026-02-07 16:15:54'),
(14, 12, NULL, 'Salle de Bain', 1, 0, 26, 0, '2026-02-07 16:20:50', '2026-02-07 16:20:50'),
(15, 12, NULL, 'Terrasse et Toit de la Terrasse (6m x 2.5m)', 1, 0, 27, 0, '2026-02-07 16:24:48', '2026-02-07 16:27:29'),
(50, 14, NULL, 'Préparation du terrain', 0, 0, NULL, 1, '2026-02-17 03:39:18', '2026-02-17 04:15:07'),
(51, 14, 50, 'Fouille', 0, 0, NULL, 1, '2026-02-17 03:39:18', '2026-02-17 04:15:17'),
(52, 14, 50, 'Site Railing', 0, 0, NULL, 2, '2026-02-17 03:39:20', '2026-02-17 04:15:26'),
(53, 14, NULL, 'La Base', 0, 0, NULL, 2, '2026-02-17 03:39:21', '2026-02-17 04:15:34'),
(54, 14, 53, 'Compactage de la base', 0, 0, NULL, 1, '2026-02-17 03:39:21', '2026-02-17 04:15:43'),
(55, 14, 53, 'Radier', 0, 0, NULL, 2, '2026-02-17 03:39:22', '2026-02-17 04:15:51'),
(56, 14, 53, 'Coulage', 0, 0, NULL, 3, '2026-02-17 03:39:25', '2026-02-17 04:16:00'),
(57, 14, NULL, 'Les Murs', 0, 0, NULL, 3, '2026-02-17 03:39:26', '2026-02-17 04:16:09'),
(58, 14, 57, 'Montage', 0, 0, NULL, 1, '2026-02-17 03:39:26', '2026-02-17 04:16:17'),
(59, 14, 57, 'Coulage', 0, 0, NULL, 2, '2026-02-17 03:39:28', '2026-02-17 04:18:33'),
(60, 14, 57, 'Crépissage Intérieur', 0, 0, NULL, 3, '2026-02-17 03:39:30', '2026-02-17 04:20:37'),
(61, 14, 57, 'Crépissage Extérieur', 0, 0, NULL, 4, '2026-02-17 03:39:32', '2026-02-17 04:22:47'),
(62, 14, NULL, 'Étanchéité', 0, 0, NULL, 4, '2026-02-17 03:39:34', '2026-02-17 04:24:44'),
(63, 14, 62, 'Étanchéité Intérieure', 0, 0, NULL, 1, '2026-02-17 03:39:34', '2026-02-17 04:34:02'),
(64, 14, 62, 'Étanchéité Extérieure', 0, 0, NULL, 2, '2026-02-17 03:39:35', '2026-02-17 04:35:47'),
(65, 14, NULL, 'Plomberie & Électricité Structure', 0, 0, NULL, 5, '2026-02-17 03:39:37', '2026-02-17 04:40:10'),
(66, 14, 65, 'Plomberie', 0, 0, NULL, 1, '2026-02-17 03:39:37', '2026-02-17 04:40:21'),
(67, 14, 65, 'Électricité', 0, 0, NULL, 2, '2026-02-17 03:39:39', '2026-02-17 04:42:53'),
(68, 14, NULL, 'Électrique', 1, 0, NULL, 10, '2026-02-17 03:39:41', '2026-02-17 04:46:07'),
(69, 14, 68, 'Éclairage', 1, 1, NULL, 1, '2026-02-17 03:39:41', '2026-02-17 16:04:04'),
(70, 14, 68, 'Automatisation', 1, 0, NULL, 2, '2026-02-17 03:39:42', '2026-02-17 16:56:12'),
(71, 14, NULL, 'Structurel', 1, 0, NULL, 11, '2026-02-17 03:39:43', '2026-02-17 04:48:45'),
(72, 14, 71, 'Marches de 60cm de large', 1, 0, NULL, 1, '2026-02-17 03:39:43', '2026-02-17 04:48:57'),
(73, 14, 71, 'Banc', 1, 0, NULL, 2, '2026-02-17 03:39:46', '2026-02-17 05:01:00'),
(74, 14, NULL, 'Filtration', 1, 0, NULL, 12, '2026-02-17 03:39:49', '2026-02-17 05:01:14'),
(75, 14, 74, 'Filtration de Base', 1, 0, NULL, 1, '2026-02-17 03:39:50', '2026-02-17 05:01:31'),
(76, 14, 74, 'Filtration Améliorée', 1, 0, NULL, 2, '2026-02-17 03:39:51', '2026-02-17 05:06:00'),
(77, 14, NULL, 'Finitions', 1, 0, NULL, 13, '2026-02-17 03:39:52', '2026-02-17 05:10:34'),
(78, 14, 77, 'Carrelage', 1, 0, NULL, 1, '2026-02-17 03:39:52', '2026-02-17 05:10:43'),
(108, 15, NULL, '1/ Préparation du terrain', 0, 0, NULL, 1, '2026-02-21 18:18:31', '2026-02-21 18:18:31'),
(109, 15, 108, '1A/ Fouille', 0, 0, NULL, 1, '2026-02-21 18:18:31', '2026-02-21 18:18:31'),
(110, 15, 108, '1B/ Site Railing', 0, 0, NULL, 2, '2026-02-21 18:18:33', '2026-02-21 18:18:33'),
(111, 15, NULL, '2/ La Base', 0, 0, NULL, 2, '2026-02-21 18:18:35', '2026-02-21 18:18:35'),
(112, 15, 111, '2A/ Compactage de la base', 0, 0, NULL, 1, '2026-02-21 18:18:35', '2026-02-21 18:18:35'),
(113, 15, 111, '2B/ Radier', 0, 0, NULL, 2, '2026-02-21 18:18:36', '2026-02-21 18:18:36'),
(114, 15, 111, '2C/ Coulage', 0, 0, NULL, 3, '2026-02-21 18:18:39', '2026-02-21 18:18:39'),
(115, 15, NULL, '3/ Les Murs', 0, 0, NULL, 3, '2026-02-21 18:18:40', '2026-02-21 18:18:40'),
(116, 15, 115, '3A/ Montage', 0, 0, NULL, 1, '2026-02-21 18:18:40', '2026-02-21 18:18:40'),
(117, 15, 115, '3B/ Coulage', 0, 0, NULL, 2, '2026-02-21 18:18:42', '2026-02-21 18:18:42'),
(118, 15, 115, '3C/ Crépissage Intérieur', 0, 0, NULL, 3, '2026-02-21 18:18:43', '2026-02-21 18:18:43'),
(119, 15, 115, '3D/ Crépissage Extérieur', 0, 0, NULL, 4, '2026-02-21 18:18:46', '2026-02-21 18:18:46'),
(120, 15, NULL, '4/ Étanchéité', 0, 0, NULL, 4, '2026-02-21 18:18:48', '2026-02-21 18:18:48'),
(121, 15, 120, '4A/ Étanchéité Intérieure', 0, 0, NULL, 1, '2026-02-21 18:18:48', '2026-02-21 18:18:48'),
(122, 15, 120, '4B/ Étanchéité Extérieure', 0, 0, NULL, 2, '2026-02-21 18:18:49', '2026-02-21 18:18:49'),
(123, 15, NULL, '5/ Plomberie & Électricité Structure', 0, 0, NULL, 5, '2026-02-21 18:18:50', '2026-02-21 18:18:50'),
(124, 15, 123, '5A/ Plomberie', 0, 0, NULL, 1, '2026-02-21 18:18:51', '2026-02-21 18:18:51'),
(125, 15, 123, '5B/ Électricité', 0, 0, NULL, 2, '2026-02-21 18:18:53', '2026-02-21 18:18:53'),
(126, 15, NULL, 'OPT1 Électrique', 1, 0, NULL, 10, '2026-02-21 18:18:55', '2026-02-21 18:18:55'),
(127, 15, 126, 'OPT1A Éclairage', 1, 1, NULL, 1, '2026-02-21 18:18:55', '2026-02-21 18:22:08'),
(128, 15, 126, 'OPT1B Autres', 1, 0, NULL, 2, '2026-02-21 18:18:55', '2026-02-21 18:18:55'),
(129, 15, NULL, 'OPT2 Structure', 1, 0, NULL, 11, '2026-02-21 18:18:56', '2026-02-21 18:18:56'),
(130, 15, 129, 'OPT2A Marches de 60cm de large', 1, 0, NULL, 1, '2026-02-21 18:18:57', '2026-02-21 18:18:57'),
(131, 15, 129, 'OPT2B Banc (longueur ou largeur)', 1, 0, NULL, 2, '2026-02-21 18:18:59', '2026-02-21 18:18:59'),
(132, 15, NULL, 'OPT3 Filtration', 1, 0, NULL, 12, '2026-02-21 18:19:02', '2026-02-21 18:19:02'),
(133, 15, 132, 'OPT3A Filtration Basique', 1, 0, NULL, 1, '2026-02-21 18:19:03', '2026-02-21 18:19:03'),
(134, 15, 132, 'OPT3B Filtration Améliorée', 1, 0, NULL, 2, '2026-02-21 18:19:04', '2026-02-21 18:19:04'),
(135, 15, NULL, 'OPT4 Finitions', 1, 0, NULL, 13, '2026-02-21 18:19:05', '2026-02-21 18:19:05'),
(136, 15, 135, 'OPT4A Carrelage', 1, 0, NULL, 1, '2026-02-21 18:19:05', '2026-02-21 18:19:05'),
(137, 18, NULL, '1/ Préparation du terrain', 0, 0, NULL, 1, '2026-02-23 05:32:57', '2026-02-23 05:32:57'),
(138, 18, 137, '1A/ Fouille', 0, 0, NULL, 1, '2026-02-23 05:32:58', '2026-02-23 05:32:58'),
(139, 18, 137, '1B/ Site Railing', 0, 0, NULL, 2, '2026-02-23 05:32:59', '2026-02-23 05:32:59'),
(140, 18, NULL, '2/ La Base', 0, 0, NULL, 2, '2026-02-23 05:33:01', '2026-02-23 05:33:01'),
(141, 18, 140, '2A/ Compactage de la base', 0, 0, NULL, 1, '2026-02-23 05:33:01', '2026-02-23 05:33:01'),
(142, 18, 140, '2B/ Radier', 0, 0, NULL, 2, '2026-02-23 05:33:02', '2026-02-23 05:33:02'),
(143, 18, 140, '2C/ Coulage', 0, 0, NULL, 3, '2026-02-23 05:33:05', '2026-02-23 05:33:05'),
(144, 18, NULL, '3/ Les Murs', 0, 0, NULL, 3, '2026-02-23 05:33:06', '2026-02-23 05:33:06'),
(145, 18, 144, '3A/ Montage', 0, 0, NULL, 1, '2026-02-23 05:33:06', '2026-02-23 05:33:06'),
(146, 18, 144, '3B/ Coulage', 0, 0, NULL, 2, '2026-02-23 05:33:08', '2026-02-23 05:33:08'),
(147, 18, 144, '3C/ Crépissage Intérieur', 0, 0, NULL, 3, '2026-02-23 05:33:10', '2026-02-23 05:33:10'),
(148, 18, 144, '3D/ Crépissage Extérieur', 0, 0, NULL, 4, '2026-02-23 05:33:12', '2026-02-23 05:33:12'),
(149, 18, NULL, '4/ Étanchéité', 0, 0, NULL, 4, '2026-02-23 05:33:14', '2026-02-23 05:33:14'),
(150, 18, 149, '4A/ Étanchéité Intérieure', 0, 0, NULL, 1, '2026-02-23 05:33:14', '2026-02-23 05:33:14'),
(151, 18, 149, '4B/ Étanchéité Extérieure', 0, 0, NULL, 2, '2026-02-23 05:33:15', '2026-02-23 05:33:15'),
(152, 18, NULL, '5/ Plomberie & Électricité Structure', 0, 0, NULL, 5, '2026-02-23 05:33:17', '2026-02-23 05:33:17'),
(153, 18, 152, '5A/ Plomberie', 0, 0, NULL, 1, '2026-02-23 05:33:17', '2026-02-23 05:33:17'),
(154, 18, 152, '5B/ Électricité', 0, 0, NULL, 2, '2026-02-23 05:33:19', '2026-02-23 05:33:19'),
(155, 18, NULL, 'Électrique', 1, 0, NULL, 10, '2026-02-23 05:33:21', '2026-03-02 14:14:12'),
(156, 18, 155, 'Éclairage', 1, 1, NULL, 1, '2026-02-23 05:33:22', '2026-03-02 14:14:24'),
(157, 18, 155, 'OPT1B Autres', 1, 0, NULL, 2, '2026-02-23 05:33:22', '2026-02-23 05:33:22'),
(158, 18, NULL, 'OPT2 Structure', 1, 0, NULL, 11, '2026-02-23 05:33:23', '2026-02-23 05:33:23'),
(159, 18, 158, 'OPT2A Marches de 60cm de large', 1, 0, NULL, 1, '2026-02-23 05:33:23', '2026-02-23 05:33:23'),
(160, 18, 158, 'OPT2B Banc (longueur ou largeur)', 1, 0, NULL, 2, '2026-02-23 05:33:26', '2026-02-23 05:33:26'),
(161, 18, NULL, 'OPT3 Filtration', 1, 0, NULL, 12, '2026-02-23 05:33:29', '2026-02-23 05:33:29'),
(162, 18, 161, 'OPT3A Filtration Basique', 1, 0, NULL, 1, '2026-02-23 05:33:30', '2026-02-23 05:33:30'),
(163, 18, 161, 'OPT3B Filtration Améliorée', 1, 0, NULL, 2, '2026-02-23 05:33:32', '2026-02-23 05:33:32'),
(164, 18, NULL, 'OPT4 Finitions', 1, 0, NULL, 13, '2026-02-23 05:33:32', '2026-02-23 05:33:32'),
(165, 18, 164, 'OPT4A Carrelage', 1, 0, NULL, 1, '2026-02-23 05:33:32', '2026-02-23 05:33:32'),
(166, 19, NULL, 'Fondations Basiques', 1, 0, NULL, 10, '2026-02-23 14:30:07', '2026-02-23 14:40:16'),
(167, 19, NULL, 'Structure', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(168, 19, NULL, 'Ouvertures en Aluminium', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(169, 19, NULL, 'Electricité', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(170, 19, NULL, 'Ouvertures en Bois', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(171, 19, NULL, 'Revêtement des Sols', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(172, 19, NULL, 'Transport', 0, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(173, 19, NULL, 'Amélioration Fondations (Basiques -> Complètes)', 1, 0, NULL, 11, '2026-02-23 14:30:07', '2026-02-23 14:41:28'),
(175, 19, NULL, 'Ameublement', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(176, 19, NULL, 'Circuit Sanitaire', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(177, 19, NULL, 'Meubles de Cuisine', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(178, 19, NULL, 'Equipements Electro', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(179, 19, NULL, 'Salle de Bain', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(180, 19, NULL, 'Terrasse et Toit de la Terrasse (6m x 2.5m)', 1, 0, NULL, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(181, 20, NULL, 'Fondations Basiques', 1, 0, NULL, 10, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(182, 20, NULL, 'Structure', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(183, 20, NULL, 'Ouvertures en Aluminium', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(184, 20, NULL, 'Electricité', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(185, 20, NULL, 'Ouvertures en Bois', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(186, 20, NULL, 'Revêtement des Sols', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(187, 20, NULL, 'Transport', 0, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(188, 20, NULL, 'Amélioration Fondations (Basiques -> Complètes)', 1, 0, NULL, 11, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(189, 20, NULL, 'Ameublement', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(190, 20, NULL, 'Circuit Sanitaire', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(191, 20, NULL, 'Meubles de Cuisine', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(192, 20, NULL, 'Equipements Electro', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(193, 20, NULL, 'Salle de Bain', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(194, 20, NULL, 'Terrasse et Toit de la Terrasse (6m x 2.5m)', 1, 0, NULL, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(195, 21, NULL, 'Fondations Basiques', 1, 0, NULL, 10, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(196, 21, NULL, 'Structure', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(197, 21, NULL, 'Ouvertures en Aluminium', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(198, 21, NULL, 'Electricité', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(199, 21, NULL, 'Ouvertures en Bois', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(200, 21, NULL, 'Revêtement des Sols', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(201, 21, NULL, 'Transport', 0, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(202, 21, NULL, 'Decking en Bois Composite autour de la Piscine - 33m2', 1, 0, NULL, 11, '2026-03-01 15:01:35', '2026-03-01 15:23:46'),
(203, 21, NULL, 'Ameublement', 1, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(206, 21, NULL, 'Equipements Electro', 1, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(207, 21, NULL, '2 x Salles de Bain', 1, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:37:22'),
(208, 21, NULL, '2 x Terrasses et Toits de la Terrasse (2.5m x 2.5m)', 1, 0, NULL, 0, '2026-03-01 15:01:35', '2026-03-01 15:29:58');

-- --------------------------------------------------------

--
-- Table structure for table `boq_lines`
--

CREATE TABLE `boq_lines` (
  `id` int NOT NULL,
  `category_id` int NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `quantity_formula` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unité' COMMENT 'Unit of measure (unité, m², m³, kg, etc.)',
  `unit_cost_ht` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Unit cost excluding tax',
  `unit_cost_formula` text COLLATE utf8mb4_unicode_ci,
  `price_list_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `margin_percent` decimal(5,2) NOT NULL DEFAULT '30.00' COMMENT 'Margin percentage, default 30%',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boq_lines`
--

INSERT INTO `boq_lines` (`id`, `category_id`, `description`, `quantity`, `quantity_formula`, `unit`, `unit_cost_ht`, `unit_cost_formula`, `price_list_id`, `supplier_id`, `margin_percent`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 1, 'Location d\'un JCB (1 jour)', 1.0000, NULL, 'jour', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:25:18', '2026-02-05 09:36:22'),
(2, 1, 'Main d\'oeuvre', 6.0000, NULL, 'jour', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:28:36', '2026-02-05 09:36:34'),
(3, 1, 'Ciment', 15.0000, NULL, 'unité', 180.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:38:02', '2026-02-05 09:38:02'),
(4, 1, 'Rocksand', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:39:01', '2026-02-05 09:39:01'),
(5, 1, 'Macadam', 3.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:39:25', '2026-02-14 05:21:33'),
(6, 1, 'Transport', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:39:54', '2026-02-05 09:39:54'),
(7, 1, 'Evacuation du surplus de terre et roches', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:40:34', '2026-02-05 09:40:34'),
(8, 2, '1 x Containeur de 6m reconditionné, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), Toit d\'une seule pente en Tole avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 1.0000, NULL, 'unité', 395000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 09:47:15', '2026-02-05 15:32:14'),
(9, 3, '1 x Porte Coullissante 2000mm', 1.0000, NULL, 'unité', 42000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:29:50', '2026-02-05 10:36:16'),
(10, 3, '1 x Fenêtre dans la salle de bain 500mm x 500mm', 1.0000, NULL, 'unité', 4000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:30:12', '2026-02-05 10:35:01'),
(11, 3, '1 x Fenêtre dans la cuisine 500mm x 1100mm', 2.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:30:42', '2026-02-05 10:30:42'),
(12, 4, 'Panneau électrique', 1.0000, NULL, 'unité', 2000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:37:16', '2026-02-05 10:37:16'),
(13, 4, 'Breakers', 4.0000, NULL, 'unité', 600.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:38:22', '2026-02-05 10:38:22'),
(14, 4, 'RCD 63A', 1.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:38:42', '2026-02-05 10:38:42'),
(15, 4, 'Isolateur 63A', 1.0000, NULL, 'unité', 2000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:38:58', '2026-02-05 10:38:58'),
(16, 4, 'Lumieres Plafond', 3.0000, NULL, 'unité', 300.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:39:50', '2026-02-05 10:39:50'),
(17, 4, 'Prises Doubles', 4.0000, NULL, 'unité', 900.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:40:38', '2026-02-05 10:40:38'),
(18, 4, 'Prise 16A', 1.0000, NULL, 'unité', 800.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:40:59', '2026-02-14 03:38:52'),
(19, 4, 'Prise Etanche 16A', 1.0000, NULL, 'unité', 1500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:41:27', '2026-02-05 10:41:27'),
(20, 4, 'Fils Electriques', 1.0000, NULL, 'forfait', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:41:54', '2026-02-05 10:47:40'),
(21, 4, 'Electricien', 1.0000, NULL, 'forfait', 20000.00, NULL, NULL, 3, 30.00, 0, '2026-02-05 10:42:40', '2026-02-05 10:42:40'),
(22, 5, 'Porte en bois de 750mm pour la salle de bain', 1.0000, NULL, 'unité', 22000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:48:26', '2026-02-05 10:48:26'),
(23, 6, 'Couche de béton autonivellant (1 a 8mm)', 15.0000, NULL, 'm²', 1500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:49:57', '2026-02-05 10:50:18'),
(24, 6, 'Main d\'Oeuvre (Béton et SPC)', 4.0000, NULL, 'jour', 2500.00, NULL, NULL, 4, 30.00, 0, '2026-02-05 10:50:48', '2026-02-05 10:52:19'),
(25, 6, 'SPC & Plynthes (inc Installation)', 15.0000, NULL, 'm²', 1200.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:51:47', '2026-02-05 10:56:32'),
(26, 7, 'Camion Conteneur', 2.0000, NULL, 'unité', 12500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 10:53:36', '2026-02-05 10:53:36'),
(27, 8, 'Parpaings 200mm', 120.0000, NULL, 'unité', 35.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:27:06', '2026-02-05 15:27:06'),
(28, 8, 'Parpaing U 200mm', 60.0000, NULL, 'unité', 60.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:27:39', '2026-02-14 05:20:29'),
(29, 8, 'Rocksand 0.2', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:28:17', '2026-02-05 15:28:17'),
(30, 8, 'Macadam ½', 2.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:28:52', '2026-02-14 03:55:31'),
(31, 8, 'Transport', 1.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:29:23', '2026-02-05 15:29:23'),
(32, 8, 'Main d\'Oeuvre', 5.0000, NULL, 'jour', 5000.00, NULL, NULL, 2, 30.00, 0, '2026-02-05 15:30:42', '2026-02-05 15:30:42'),
(33, 9, 'Structure en métal, Tole, Main d\'Oeuvre, Peinture, Traitement anti-rouille et Transport', 1.0000, NULL, 'forfait', 20000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-05 15:34:12', '2026-02-05 15:34:12'),
(34, 10, 'Table/Rangement pour la Salle de bain', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:44:06', '2026-02-07 13:44:06'),
(35, 10, 'Placard', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:44:21', '2026-02-07 13:44:21'),
(36, 10, 'Lit de 1m90 x 1.35', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:44:57', '2026-02-07 13:44:57'),
(37, 10, 'Miroir', 1.0000, NULL, 'unité', 4000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:45:16', '2026-02-07 13:45:16'),
(38, 10, 'Table de Chevet', 2.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:45:34', '2026-02-07 13:45:34'),
(39, 11, 'Réservoir d\'Eau 500 lts', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:52:33', '2026-02-07 13:56:01'),
(40, 11, 'Fosse Septique Polyéthylène enterrée 2000 Lts', 1.0000, NULL, 'unité', 24000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:55:14', '2026-02-07 13:55:14'),
(41, 11, 'Bac à Graisse', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:55:33', '2026-02-07 13:55:33'),
(42, 11, 'Pompe à Eau - approx 450w + Control Automatique', 1.0000, NULL, 'unité', 6000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:56:49', '2026-02-07 13:56:49'),
(43, 11, 'Tuyaux & Coude', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:57:33', '2026-02-07 13:57:33'),
(44, 11, 'Fouille (JCB - 1 jour)', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:58:09', '2026-02-07 13:58:09'),
(45, 11, 'Camion pour évacuation des déchets', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:58:41', '2026-02-07 13:58:41'),
(46, 11, 'Camion Matériaux', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:58:59', '2026-02-07 13:59:57'),
(47, 11, 'Rocksand', 10.0000, NULL, 'tonne', 650.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 13:59:42', '2026-02-07 14:00:23'),
(48, 11, 'Plombier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 14:00:52', '2026-02-07 14:01:26'),
(49, 11, 'Jardinier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 14:01:10', '2026-02-07 14:01:10'),
(50, 11, 'Couvercle de Pompe', 1.0000, NULL, 'unité', 3500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 14:03:49', '2026-02-07 14:03:49'),
(51, 12, 'Table de 2.5m de long\n• Meuble suspendu', 1.0000, NULL, 'unité', 80000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:14:16', '2026-02-07 16:32:48'),
(52, 13, 'Réfrigérateur 208 Lts approx.', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:16:23', '2026-02-07 16:17:21'),
(53, 13, 'Hotte Aspirante 60 cm', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:16:52', '2026-02-07 16:16:52'),
(54, 13, 'Plaque électrique 2 feux', 1.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:17:13', '2026-02-07 16:17:13'),
(55, 13, 'Micro-onde (20 Lts)', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:17:41', '2026-02-07 16:17:41'),
(56, 13, 'Machine à laver le linge (7Kg)', 1.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:18:00', '2026-02-07 16:18:00'),
(57, 13, 'Chauffe-eau électrique (7Kw Instantané)', 1.0000, NULL, 'unité', 8500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:18:42', '2026-02-07 16:18:42'),
(58, 13, 'Climatiseur 12000 BTU', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:18:55', '2026-02-07 16:18:55'),
(59, 13, 'TV Smart 32\"', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:19:15', '2026-02-07 16:19:15'),
(60, 14, 'Toilette', 1.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:21:09', '2026-02-07 16:21:09'),
(61, 14, 'Carrelage dans la cabine de douche (Choix du carrelage avant la production selon budget)', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:21:38', '2026-02-07 16:21:38'),
(62, 14, 'Lavabo & Robinet', 1.0000, NULL, 'unité', 9000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:22:05', '2026-02-07 16:22:05'),
(63, 14, 'Mitigeur de douche', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:22:28', '2026-02-07 16:22:28'),
(64, 14, 'Plombier', 2.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:22:48', '2026-02-07 16:22:48'),
(65, 15, 'Structure en Metal', 1.0000, NULL, 'unité', 100000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:25:43', '2026-02-07 16:25:43'),
(66, 15, 'Decking en composite (Choix de couleur avant la production)', 1.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:26:02', '2026-02-07 16:27:16'),
(67, 15, 'Toles (Choix de couleur avant la production)', 1.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:26:45', '2026-02-07 16:26:45'),
(68, 8, 'Barres Y10', 1.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-07 16:31:26', '2026-02-07 16:31:26'),
(163, 51, 'Location de JCB', 1.0000, '1', 'jour', 10000.00, NULL, 3, 14, 30.00, 1, '2026-02-17 03:39:18', '2026-02-17 03:53:46'),
(164, 51, 'Main d\'oeuvre', 1.0000, '0.125 * surface_m2', 'jour', 2500.00, NULL, 1, 7, 30.00, 2, '2026-02-17 03:39:19', '2026-02-17 03:54:04'),
(165, 51, 'Transport de matériaux', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, 13, 30.00, 3, '2026-02-17 03:39:19', '2026-02-17 03:54:25'),
(166, 51, 'Transport évacuation de la terre', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, 13, 30.00, 4, '2026-02-17 03:39:19', '2026-02-17 08:40:53'),
(167, 52, 'Main d\'oeuvre', 1.0000, 'ceil((0.25 * surface_m2)/7)', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:20', '2026-02-17 09:34:19'),
(168, 52, 'Bois', 1.0000, 'CEIL((perimetre_m + 4) / 2.4)', 'planche', 250.00, NULL, 10, 6, 30.00, 2, '2026-02-17 03:39:20', '2026-02-17 03:55:33'),
(169, 52, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, 6, 30.00, 3, '2026-02-17 03:39:21', '2026-02-17 03:55:53'),
(170, 52, 'Nylon (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 30, 6, 30.00, 4, '2026-02-17 03:39:21', '2026-02-17 03:56:10'),
(171, 54, 'Location dammeuse', 1.0000, '1', 'jour', 2500.00, NULL, 4, 15, 30.00, 1, '2026-02-17 03:39:22', '2026-02-17 03:56:37'),
(172, 54, 'Main d\'oeuvre', 1.0000, 'CEIL((surface_m2 / 15)/4)', 'jour', 2500.00, NULL, 1, 15, 30.00, 2, '2026-02-17 03:39:22', '2026-02-17 09:35:50'),
(173, 55, 'Crusherrun', 1.0000, 'ceil(volume_base_m3 * 1.6)', 'tonne', 1200.00, NULL, 5, 16, 30.00, 1, '2026-02-17 03:39:23', '2026-02-17 03:57:50'),
(174, 55, 'Fer Y12 pour base', 1.0000, 'ceil((((largeur / 0.2 * (longueur + 1)) + (longueur / 0.2 * (largeur + 1))) * 2)/9)', 'barre', 850.00, NULL, 6, 6, 30.00, 2, '2026-02-17 03:39:23', '2026-02-17 03:58:07'),
(175, 55, 'Fer Y12 pour amorce murs', 1.0000, 'ceil(((perimetre_m / 0.2) * (profondeur + 1))/9)', 'barre', 850.00, NULL, 6, 6, 30.00, 3, '2026-02-17 03:39:23', '2026-02-17 03:58:27'),
(176, 55, 'Plastique noir', 1.0000, 'surface_m2', 'unité', 500.00, NULL, 9, 6, 30.00, 4, '2026-02-17 03:39:23', '2026-02-17 03:58:51'),
(177, 55, 'Bois de coffrage', 1.0000, 'CEIL(perimetre_base_m / 2.4)', 'planche', 250.00, NULL, 10, 6, 30.00, 5, '2026-02-17 03:39:24', '2026-02-17 03:59:50'),
(178, 55, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, 6, 30.00, 6, '2026-02-17 03:39:24', '2026-02-17 04:00:11'),
(179, 55, 'Fer d\'attache (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 12, 6, 30.00, 7, '2026-02-17 03:39:24', '2026-02-17 04:00:28'),
(180, 55, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, 6, 30.00, 8, '2026-02-17 03:39:25', '2026-02-17 04:00:45'),
(181, 56, 'Main d\'oeuvre', 1.0000, '1', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:25', '2026-02-17 04:01:08'),
(182, 56, 'Béton', 1.0000, 'ceil(volume_base_m3)', 'm³', 5500.00, NULL, 21, 17, 30.00, 2, '2026-02-17 03:39:25', '2026-02-17 04:13:30'),
(183, 56, 'Eau Béton', 1.0000, '1', 'forfait', 2000.00, NULL, 22, 17, 30.00, 3, '2026-02-17 03:39:26', '2026-02-17 04:13:46'),
(184, 58, 'Main d\'oeuvre', 1.0000, 'ceil(nombre_blocs_bab / 75)', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:27', '2026-02-17 04:14:07'),
(185, 58, 'Fer Y12 barres verticales', 1.0000, 'ceil((perimetre_m / 0.2 * profondeur)/9)', 'barre', 850.00, NULL, 6, 6, 30.00, 2, '2026-02-17 03:39:27', '2026-02-17 04:14:25'),
(186, 58, 'Fer Y10 barres horizontales', 1.0000, 'ceil(perimetre_m * 2 / 9)', 'barre', 650.00, NULL, 7, 6, 30.00, 3, '2026-02-17 03:39:27', '2026-02-17 04:14:48'),
(187, 58, 'Ciment', 1.0000, 'CEIL(((longueur * profondeur * 2 + largeur * profondeur * 2) * 40 / 25 * 1.1)/1.6)', 'sac', 280.00, NULL, 14, 6, 30.00, 4, '2026-02-17 03:39:28', '2026-02-17 09:07:28'),
(188, 58, 'Rocksand .4', 1.0000, 'ceil((longueur * profondeur * 2 + largeur * profondeur * 2) * 50 / 1000 * 1.1)', 'tonne', 1100.00, NULL, 15, 16, 30.00, 5, '2026-02-17 03:39:28', '2026-02-17 04:17:54'),
(189, 58, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, 13, 30.00, 6, '2026-02-17 03:39:28', '2026-02-17 04:18:16'),
(190, 59, 'Macadam 3/8', 1.0000, 'ceil(perimetre_m * profondeur * 0.15 * 0.8 * 1.1)', 'tonne', 1800.00, NULL, 13, 16, 30.00, 1, '2026-02-17 03:39:29', '2026-02-17 04:18:50'),
(191, 59, 'Ciment', 1.0000, 'CEIL((perimetre_m * profondeur * 0.15 * 350 / 25 * 1.1)/1.6)', 'sac', 280.00, NULL, 14, 6, 30.00, 2, '2026-02-17 03:39:29', '2026-02-17 09:06:50'),
(192, 59, 'Rocksand .4', 1.0000, 'ceil(perimetre_m * profondeur * 0.15 * 0.4 * 1.5 * 1.1)', 'tonne', 1100.00, NULL, 15, 16, 30.00, 3, '2026-02-17 03:39:29', '2026-02-17 04:19:53'),
(193, 59, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 20)', 'unité', 4500.00, NULL, 2, 13, 30.00, 4, '2026-02-17 03:39:30', '2026-02-17 09:11:03'),
(194, 60, 'Main d\'oeuvre', 1.0000, 'CEIL((surface_interieur_m2 / 35)*2)', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:30', '2026-02-17 09:40:49'),
(195, 60, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieur_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, 16, 30.00, 2, '2026-02-17 03:39:30', '2026-02-17 04:21:11'),
(196, 60, 'Colle Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, 6, 30.00, 3, '2026-02-17 03:39:31', '2026-02-17 04:21:25'),
(197, 60, 'Latex', 1.0000, 'CEIL(surface_interieur_m2 / 10)', 'bouteille', 800.00, NULL, 18, 6, 30.00, 4, '2026-02-17 03:39:31', '2026-02-17 04:21:42'),
(198, 60, 'Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', 'sac', 280.00, NULL, 14, 6, 30.00, 5, '2026-02-17 03:39:31', '2026-02-17 04:21:59'),
(199, 60, 'Transport Matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, 13, 30.00, 6, '2026-02-17 03:39:32', '2026-02-17 04:22:34'),
(200, 61, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieur_m2 / 35)', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:32', '2026-02-17 04:23:04'),
(201, 61, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieur_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, 16, 30.00, 2, '2026-02-17 03:39:33', '2026-02-17 04:23:21'),
(202, 61, 'Colle Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, 6, 30.00, 3, '2026-02-17 03:39:33', '2026-02-17 04:23:38'),
(203, 61, 'Latex', 1.0000, 'CEIL(surface_interieur_m2 / 10)', 'bouteille', 800.00, NULL, 18, 6, 30.00, 4, '2026-02-17 03:39:33', '2026-02-17 04:23:57'),
(204, 61, 'Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', 'sac', 280.00, NULL, 14, 6, 30.00, 5, '2026-02-17 03:39:33', '2026-02-17 04:24:14'),
(205, 61, 'Transport Matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, 13, 30.00, 6, '2026-02-17 03:39:34', '2026-02-17 04:24:31'),
(206, 63, 'Main d\'oeuvre', 1.0000, 'CEIL((surface_interieur_m2 / 35) * 2)', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:34', '2026-02-17 08:51:25'),
(207, 63, 'TAL Sureproof', 1.0000, 'CEIL((surface_interieur_m2 / 42) * 3.5)', 'kit', 4500.00, '5500', 19, 12, 30.00, 2, '2026-02-17 03:39:35', '2026-02-17 08:49:45'),
(208, 63, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, 6, 30.00, 3, '2026-02-17 03:39:35', '2026-02-17 04:35:09'),
(209, 64, 'Main d\'oeuvre', 1.0000, 'CEIL(perimetre_m*profondeur)', 'jour', 2500.00, '200', 1, 7, 30.00, 1, '2026-02-17 03:39:36', '2026-02-17 08:56:18'),
(210, 64, 'Pekay Noir', 1.0000, 'CEIL(perimetre_m*profondeur)', 'm²', 350.00, NULL, 20, 12, 30.00, 2, '2026-02-17 03:39:36', '2026-02-17 08:55:28'),
(211, 64, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, 6, 30.00, 3, '2026-02-17 03:39:36', '2026-02-17 04:36:19'),
(212, 66, 'Plombier', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'jour', 3000.00, NULL, 44, 9, 30.00, 1, '2026-02-17 03:39:37', '2026-02-17 04:40:43'),
(213, 66, 'Skimmer', 1.0000, 'CEIL(volume_m3 / 36)', 'unité', 3500.00, NULL, 23, 18, 30.00, 2, '2026-02-17 03:39:37', '2026-02-17 04:41:21'),
(214, 66, 'Traversée de parois', 1.0000, 'CEIL(volume_m3 / 36) * 2', 'unité', 2500.00, NULL, 24, 18, 30.00, 3, '2026-02-17 03:39:38', '2026-02-17 04:41:34'),
(215, 66, 'Buses', 1.0000, 'CEIL(volume_m3 / 36) * 2', 'unité', 1500.00, NULL, 46, 18, 30.00, 4, '2026-02-17 03:39:38', '2026-02-17 04:41:47'),
(216, 66, 'Tuyaux 50mm Haute Pression', 1.0000, 'CEIL(perimetre_m * 2 / 5.8)', 'unité', 850.00, NULL, 25, 6, 30.00, 5, '2026-02-17 03:39:38', '2026-02-17 04:42:04'),
(217, 66, 'Colle PVC (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 26, 6, 30.00, 6, '2026-02-17 03:39:39', '2026-02-17 04:42:20'),
(218, 66, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, 13, 30.00, 7, '2026-02-17 03:39:39', '2026-02-17 04:42:38'),
(219, 67, 'Électricien', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'jour', 3000.00, NULL, 43, 8, 30.00, 1, '2026-02-17 03:39:39', '2026-02-17 04:43:08'),
(220, 67, 'Tuyau spot led', 1.0000, 'CEIL(perimetre_m / 5.8)', 'unité', 450.00, NULL, 47, 6, 30.00, 2, '2026-02-17 03:39:40', '2026-02-17 04:43:23'),
(221, 67, 'Câbles électriques 2.5mm² 3 cors', 1.0000, 'ceil(perimetre_m)', 'mètre', 45.00, NULL, 27, 6, 30.00, 3, '2026-02-17 03:39:40', '2026-02-17 04:43:42'),
(222, 67, 'Boite de connexion electrique', 1.0000, 'CEIL(perimetre_m / 5.8)', 'unité', 350.00, NULL, 28, 18, 30.00, 4, '2026-02-17 03:39:40', '2026-02-17 04:43:56'),
(223, 67, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, 13, 30.00, 5, '2026-02-17 03:39:41', '2026-02-17 04:44:10'),
(224, 69, 'Spot Led', 1.0000, '1', 'unité', 2500.00, NULL, 29, 18, 30.00, 1, '2026-02-17 03:39:42', '2026-02-17 04:46:43'),
(226, 70, 'Domotique', 1.0000, '1', 'unité', 25000.00, NULL, 39, 19, 30.00, 2, '2026-02-17 03:39:42', '2026-02-17 04:48:23'),
(227, 72, 'Main d\'oeuvre', 2.0000, '2', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:43', '2026-02-17 04:49:11'),
(228, 72, 'Bloc BAB', 20.0000, '20', 'unité', 35.00, NULL, 32, 16, 30.00, 2, '2026-02-17 03:39:44', '2026-02-17 04:49:32'),
(229, 72, 'Ciment', 10.0000, '10', 'sac', 280.00, NULL, 14, 6, 30.00, 3, '2026-02-17 03:39:44', '2026-02-17 04:52:16'),
(230, 72, 'Rocksand 0.2', 2.0000, '2', 'tonne', 1200.00, NULL, 16, 16, 30.00, 4, '2026-02-17 03:39:44', '2026-02-17 04:52:31'),
(231, 72, 'Macadam 3/8', 2.0000, '2', 'tonne', 1800.00, NULL, 13, 16, 30.00, 5, '2026-02-17 03:39:45', '2026-02-17 04:52:57'),
(232, 72, 'Carrelage', 1.0000, '3', 'm²', 800.00, NULL, 33, 11, 30.00, 6, '2026-02-17 03:39:45', '2026-02-17 04:53:46'),
(233, 72, 'Carreleur', 1.0000, '3', 'm²', 400.00, NULL, 34, 10, 30.00, 7, '2026-02-17 03:39:45', '2026-02-17 04:54:10'),
(234, 72, 'Colle Carreau', 2.0000, '2', 'sac', 450.00, NULL, 35, 6, 30.00, 8, '2026-02-17 03:39:45', '2026-02-17 04:54:32'),
(235, 73, 'Main d\'oeuvre', 5.0000, '5', 'jour', 2500.00, NULL, 1, 7, 30.00, 1, '2026-02-17 03:39:46', '2026-02-17 04:55:24'),
(236, 73, 'Bloc BAB', 30.0000, '30', 'unité', 35.00, NULL, 32, 16, 30.00, 2, '2026-02-17 03:39:46', '2026-02-17 04:55:43'),
(237, 73, 'Ciment', 20.0000, '20', 'sac', 280.00, NULL, 14, 6, 30.00, 3, '2026-02-17 03:39:47', '2026-02-17 04:56:00'),
(238, 73, 'Rocksand 0.2', 3.0000, '3', 'tonne', 1200.00, NULL, 16, 16, 30.00, 4, '2026-02-17 03:39:47', '2026-02-17 04:56:17'),
(239, 73, 'Macadam 3/8', 3.0000, '3', 'tonne', 1800.00, NULL, 13, 16, 30.00, 5, '2026-02-17 03:39:47', '2026-02-17 04:56:30'),
(240, 73, 'Carrelage', 1.0000, 'ceil((longueur*profondeur)+(longueur*.5))', 'm²', 800.00, NULL, 33, 11, 30.00, 6, '2026-02-17 03:39:48', '2026-02-17 04:58:22'),
(241, 73, 'Carreleur', 1.0000, 'ceil((longueur*profondeur)+(longueur*.5))', 'm²', 400.00, NULL, 34, 10, 30.00, 7, '2026-02-17 03:39:48', '2026-02-17 04:58:55'),
(242, 73, 'Colle Carreau', 4.0000, '4', 'sac', 450.00, NULL, 35, 6, 30.00, 8, '2026-02-17 03:39:48', '2026-02-17 04:59:18'),
(243, 73, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, 6, 30.00, 9, '2026-02-17 03:39:49', '2026-02-17 04:59:36'),
(244, 73, 'Joints', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'kg', 250.00, NULL, 37, 6, 30.00, 10, '2026-02-17 03:39:49', '2026-02-17 05:00:06'),
(245, 75, 'Filtre à Sable', 1.0000, '1', 'unité', 18000.00, NULL, 40, 18, 30.00, 1, '2026-02-17 03:39:50', '2026-02-17 05:01:47'),
(246, 75, 'Pompe de Piscine', 1.0000, '1', 'unité', 12000.00, NULL, 41, 18, 30.00, 2, '2026-02-17 03:39:50', '2026-02-17 05:02:05'),
(247, 75, 'Panneau Electrique', 1.0000, '1', 'unité', 8000.00, NULL, 42, 18, 30.00, 3, '2026-02-17 03:39:50', '2026-02-17 05:02:19'),
(248, 75, 'Électricien', 1.0000, '1', 'jour', 3000.00, NULL, 43, 8, 30.00, 4, '2026-02-17 03:39:51', '2026-02-17 05:02:44'),
(249, 75, 'Plombier', 1.0000, '1', 'jour', 3000.00, NULL, 44, 9, 30.00, 5, '2026-02-17 03:39:51', '2026-02-17 05:02:59'),
(250, 76, 'Salt Chlorinateur', 1.0000, '1', 'unité', 35000.00, NULL, 45, 18, 30.00, 1, '2026-02-17 03:39:52', '2026-02-17 05:06:14'),
(251, 78, 'Carrelage', 1.0000, 'ceil(surface_interieur_m2)', 'm²', 800.00, '1500', 33, 11, 30.00, 1, '2026-02-17 03:39:53', '2026-02-17 08:47:39'),
(252, 78, 'Carreleur', 1.0000, 'ceil(surface_interieur_m2)', 'm²', 400.00, '600', 34, 10, 30.00, 2, '2026-02-17 03:39:53', '2026-02-17 08:45:38'),
(253, 78, 'Colle Carreau', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'sac', 450.00, NULL, 35, 6, 30.00, 3, '2026-02-17 03:39:53', '2026-02-17 05:12:16'),
(254, 78, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, 6, 30.00, 4, '2026-02-17 03:39:54', '2026-02-17 05:12:29'),
(255, 78, 'Joints', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'kg', 250.00, NULL, 37, 6, 30.00, 5, '2026-02-17 03:39:54', '2026-02-17 05:12:44'),
(256, 58, 'Bloc BAB', 1.0000, 'ceil(nombre_blocs_bab)', 'unité', 0.00, '50', 32, 16, 30.00, 0, '2026-02-17 04:51:07', '2026-02-17 09:17:24'),
(257, 76, 'Plombier', 1.0000, '1', 'unité', 0.00, '2500', 44, 9, 30.00, 0, '2026-02-17 05:07:36', '2026-02-17 05:08:33'),
(258, 76, 'Colle PVC', 1.0000, '1', 'unité', 0.00, '300', 26, 6, 30.00, 0, '2026-02-17 05:09:20', '2026-02-17 05:09:34'),
(259, 76, 'Tuyau PVC', 1.0000, '.5', 'unité', 0.00, '800', 25, NULL, 30.00, 0, '2026-02-17 05:10:13', '2026-02-17 05:10:13'),
(260, 55, 'Main d\'Oeuvre', 1.0000, 'ceil(surface_m2/10*1.2)', 'jour', 0.00, '2500', NULL, 7, 30.00, 0, '2026-02-17 09:38:03', '2026-02-17 09:38:03'),
(354, 109, 'Location de JCB', 1.0000, '1', 'jour', 10000.00, NULL, 3, NULL, 30.00, 1, '2026-02-21 18:18:32', '2026-02-21 18:18:32'),
(355, 109, 'Main d\'oeuvre', 1.0000, '0.125 * surface_m2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 2, '2026-02-21 18:18:32', '2026-02-21 18:18:32'),
(356, 109, 'Transport de matériaux', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, NULL, 30.00, 3, '2026-02-21 18:18:33', '2026-02-21 18:18:33'),
(357, 109, 'Transport évacuation de la terre', 1.0000, 'CEIL(surface_m2 / 15) * 3', 'unité', 4500.00, NULL, 2, NULL, 30.00, 4, '2026-02-21 18:18:33', '2026-02-21 18:18:33'),
(358, 110, 'Main d\'oeuvre', 1.0000, '0.25 * surface_m2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:34', '2026-02-21 18:18:34'),
(359, 110, 'Bois', 1.0000, 'CEIL((perimetre_m + 4) / 2.4)', 'planche', 250.00, NULL, 10, NULL, 30.00, 2, '2026-02-21 18:18:34', '2026-02-21 18:18:34'),
(360, 110, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, NULL, 30.00, 3, '2026-02-21 18:18:34', '2026-02-21 18:18:34'),
(361, 110, 'Nylon (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 30, NULL, 30.00, 4, '2026-02-21 18:18:35', '2026-02-21 18:18:35'),
(362, 112, 'Location dammeuse', 1.0000, '1', 'jour', 2500.00, NULL, 4, NULL, 30.00, 1, '2026-02-21 18:18:35', '2026-02-21 18:18:35'),
(363, 112, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_m2 / 15)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 2, '2026-02-21 18:18:36', '2026-02-21 18:18:36'),
(364, 113, 'Crusherrun', 1.0000, 'ceil(volume_base_m3 * 1.6)', 'tonne', 800.00, NULL, 5, NULL, 30.00, 1, '2026-02-21 18:18:36', '2026-02-21 18:18:36'),
(365, 113, 'Fer Y12 pour base', 1.0000, 'ceil((((largeur / 0.2 * (longueur + 1)) + (longueur / 0.2 * (largeur + 1))) * 2)/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 2, '2026-02-21 18:18:37', '2026-02-21 18:18:37'),
(366, 113, 'Fer Y12 pour amorce murs', 1.0000, 'ceil(((perimetre_m / 0.2) * (profondeur + 1))/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 3, '2026-02-21 18:18:37', '2026-02-21 18:18:37'),
(367, 113, 'Plastique noir', 1.0000, 'surface_m2', 'unité', 500.00, NULL, 9, NULL, 30.00, 4, '2026-02-21 18:18:37', '2026-02-21 18:18:37'),
(368, 113, 'Bois de coffrage', 1.0000, 'CEIL(perimetre_base_m / 2.4)', 'planche', 250.00, NULL, 10, NULL, 30.00, 5, '2026-02-21 18:18:37', '2026-02-21 18:18:37'),
(369, 113, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, NULL, 30.00, 6, '2026-02-21 18:18:38', '2026-02-21 18:18:38'),
(370, 113, 'Fer d\'attache (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 12, NULL, 30.00, 7, '2026-02-21 18:18:38', '2026-02-21 18:18:38'),
(371, 113, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, NULL, 30.00, 8, '2026-02-21 18:18:38', '2026-02-21 18:18:38'),
(372, 114, 'Main d\'oeuvre', 1.0000, '1', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:39', '2026-02-21 18:18:39'),
(373, 114, 'Béton', 1.0000, 'volume_base_m3', 'm³', 5500.00, NULL, 21, NULL, 30.00, 2, '2026-02-21 18:18:39', '2026-02-21 18:18:39'),
(374, 114, 'Eau Béton', 1.0000, '1', 'forfait', 2000.00, NULL, 22, NULL, 30.00, 3, '2026-02-21 18:18:39', '2026-02-21 18:18:39'),
(375, 116, 'Main d\'oeuvre', 1.0000, 'ceil(nombre_blocs_bab / 75)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:40', '2026-02-21 18:18:40'),
(376, 116, 'Fer Y12 barres verticales', 1.0000, 'ceil((perimetre_m / 0.2 * profondeur)/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 2, '2026-02-21 18:18:41', '2026-02-21 18:18:41'),
(377, 116, 'Fer Y10 barres horizontales', 1.0000, 'ceil(perimetre_m * 2 / 9)', 'barre', 300.00, NULL, 7, NULL, 30.00, 3, '2026-02-21 18:18:41', '2026-02-21 18:18:41'),
(378, 116, 'Ciment', 1.0000, 'CEIL((longueur * profondeur * 2 + largeur * profondeur * 2) * 40 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 4, '2026-02-21 18:18:41', '2026-02-21 18:18:41'),
(379, 116, 'Rocksand .4', 1.0000, 'ceil((longueur * profondeur * 2 + largeur * profondeur * 2) * 50 / 1000 * 1.1)', 'tonne', 1100.00, NULL, 15, NULL, 30.00, 5, '2026-02-21 18:18:41', '2026-02-21 18:18:41'),
(380, 116, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-21 18:18:42', '2026-02-21 18:18:42'),
(381, 117, 'Macadam 3/8', 1.0000, 'ceil(perimetre_m * profondeur * 0.15 * 0.8 * 1.1)', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 1, '2026-02-21 18:18:42', '2026-02-21 18:18:42'),
(382, 117, 'Ciment', 1.0000, 'CEIL(perimetre_m * profondeur * 0.15 * 350 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 2, '2026-02-21 18:18:43', '2026-02-21 18:18:43'),
(383, 117, 'Rocksand .4', 1.0000, 'ceil(perimetre_m * profondeur * 0.15 * 0.4 * 1.5 * 1.1)', 'tonne', 1100.00, NULL, 15, NULL, 30.00, 3, '2026-02-21 18:18:43', '2026-02-21 18:18:43'),
(384, 117, 'Transport matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 4, '2026-02-21 18:18:43', '2026-02-21 18:18:43'),
(385, 118, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieur_m2 / 35)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:44', '2026-02-21 18:18:44'),
(386, 118, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieur_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 2, '2026-02-21 18:18:44', '2026-02-21 18:18:44'),
(387, 118, 'Colle Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, NULL, 30.00, 3, '2026-02-21 18:18:44', '2026-02-21 18:18:44'),
(388, 118, 'Latex', 1.0000, 'CEIL(surface_interieur_m2 / 10)', 'bouteille', 800.00, NULL, 18, NULL, 30.00, 4, '2026-02-21 18:18:45', '2026-02-21 18:18:45'),
(389, 118, 'Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 5, '2026-02-21 18:18:45', '2026-02-21 18:18:45'),
(390, 118, 'Transport Matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-21 18:18:45', '2026-02-21 18:18:45'),
(391, 119, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieur_m2 / 35)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:46', '2026-02-21 18:18:46'),
(392, 119, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieur_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 2, '2026-02-21 18:18:46', '2026-02-21 18:18:46'),
(393, 119, 'Colle Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, NULL, 30.00, 3, '2026-02-21 18:18:46', '2026-02-21 18:18:46'),
(394, 119, 'Latex', 1.0000, 'CEIL(surface_interieur_m2 / 10)', 'bouteille', 800.00, NULL, 18, NULL, 30.00, 4, '2026-02-21 18:18:47', '2026-02-21 18:18:47'),
(395, 119, 'Ciment', 1.0000, 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 5, '2026-02-21 18:18:47', '2026-02-21 18:18:47'),
(396, 119, 'Transport Matériaux', 1.0000, 'CEIL(surface_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-21 18:18:47', '2026-02-21 18:18:47'),
(397, 121, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieur_m2 / 15) * 2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:48', '2026-02-21 18:18:48'),
(398, 121, 'TAL Sureproof', 1.0000, 'CEIL(surface_interieur_m2 / 42) * 7', 'kit', 4500.00, NULL, 19, NULL, 30.00, 2, '2026-02-21 18:18:49', '2026-02-21 18:18:49'),
(399, 121, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, NULL, 30.00, 3, '2026-02-21 18:18:49', '2026-02-21 18:18:49'),
(400, 122, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieur_m2 / 15) * 2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:49', '2026-02-21 18:18:49'),
(401, 122, 'Pekay Noir', 1.0000, 'CEIL(surface_interieur_m2 / 42) * 7', 'm²', 350.00, NULL, 20, NULL, 30.00, 2, '2026-02-21 18:18:50', '2026-02-21 18:18:50'),
(402, 122, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, NULL, 30.00, 3, '2026-02-21 18:18:50', '2026-02-21 18:18:50'),
(403, 124, 'Plombier', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'jour', 2500.00, NULL, 44, NULL, 30.00, 1, '2026-02-21 18:18:51', '2026-02-21 18:18:51'),
(404, 124, 'Skimmer', 1.0000, 'CEIL(volume_m3 / 36)', 'unité', 7000.00, NULL, 23, NULL, 30.00, 2, '2026-02-21 18:18:51', '2026-02-21 18:18:51'),
(405, 124, 'Traversée de parois', 1.0000, 'CEIL(volume_m3 / 36) * 2', 'unité', 1300.00, NULL, 24, NULL, 30.00, 3, '2026-02-21 18:18:51', '2026-02-21 18:18:51'),
(406, 124, 'Buses', 1.0000, 'CEIL(volume_m3 / 36) * 2', 'unité', 750.00, NULL, 46, NULL, 30.00, 4, '2026-02-21 18:18:52', '2026-02-21 18:18:52'),
(407, 124, 'Tuyaux 50mm Haute Pression', 1.0000, 'CEIL(perimetre_m * 2 / 5.8)', 'unité', 850.00, NULL, 25, NULL, 30.00, 5, '2026-02-21 18:18:52', '2026-02-21 18:18:52'),
(408, 124, 'Colle PVC (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 26, NULL, 30.00, 6, '2026-02-21 18:18:52', '2026-02-21 18:18:52'),
(409, 124, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, NULL, 30.00, 7, '2026-02-21 18:18:53', '2026-02-21 18:18:53'),
(410, 125, 'Électricien', 1.0000, 'CEIL(surface_m2 / 15) * 2', 'jour', 2500.00, NULL, 43, NULL, 30.00, 1, '2026-02-21 18:18:53', '2026-02-21 18:18:53'),
(411, 125, 'Tuyau spot led', 1.0000, 'CEIL(perimetre_m / 5.8)', 'unité', 450.00, NULL, 47, NULL, 30.00, 2, '2026-02-21 18:18:54', '2026-02-21 18:18:54'),
(412, 125, 'Câbles électriques 2.5mm² 3 cors', 1.0000, 'ceil(perimetre_m)', 'mètre', 150.00, NULL, 27, NULL, 30.00, 3, '2026-02-21 18:18:54', '2026-02-21 18:18:54'),
(413, 125, 'Boite de connexion electrique', 1.0000, 'CEIL(perimetre_m / 5.8)', 'unité', 350.00, NULL, 28, NULL, 30.00, 4, '2026-02-21 18:18:54', '2026-02-21 18:18:54'),
(414, 125, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, NULL, 30.00, 5, '2026-02-21 18:18:54', '2026-02-21 18:18:54'),
(415, 127, 'Spot Led', 1.0000, '1', 'unité', 11000.00, NULL, 29, NULL, 30.00, 1, '2026-02-21 18:18:55', '2026-02-21 18:18:55'),
(416, 128, 'Pompe de Circulation', 1.0000, '1', 'unité', 20000.00, NULL, 38, NULL, 30.00, 1, '2026-02-21 18:18:56', '2026-02-21 18:18:56'),
(417, 128, 'Domotique', 1.0000, '1', 'unité', 25000.00, NULL, 39, NULL, 30.00, 2, '2026-02-21 18:18:56', '2026-02-21 18:18:56'),
(418, 130, 'Main d\'oeuvre', 2.0000, '2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:57', '2026-02-21 18:18:57'),
(419, 130, 'Bloc BAB', 20.0000, '20', 'unité', 50.00, NULL, 32, NULL, 30.00, 2, '2026-02-21 18:18:57', '2026-02-21 18:18:57'),
(420, 130, 'Ciment', 10.0000, '10', 'sac', 240.00, NULL, 14, NULL, 30.00, 3, '2026-02-21 18:18:57', '2026-02-21 18:18:57'),
(421, 130, 'Rocksand 0.2', 2.0000, '2', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 4, '2026-02-21 18:18:58', '2026-02-21 18:18:58'),
(422, 130, 'Macadam 3/8', 2.0000, '2', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 5, '2026-02-21 18:18:58', '2026-02-21 18:18:58'),
(423, 130, 'Carrelage', 1.0000, '1', 'm²', 1700.00, NULL, 33, NULL, 30.00, 6, '2026-02-21 18:18:58', '2026-02-21 18:18:58'),
(424, 130, 'Carreleur', 1.0000, '1', 'm²', 1300.00, NULL, 34, NULL, 30.00, 7, '2026-02-21 18:18:59', '2026-02-21 18:18:59'),
(425, 130, 'Colle Carreau', 2.0000, '2', 'sac', 450.00, NULL, 35, NULL, 30.00, 8, '2026-02-21 18:18:59', '2026-02-21 18:18:59'),
(426, 131, 'Main d\'oeuvre', 5.0000, '5', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-21 18:18:59', '2026-02-21 18:18:59'),
(427, 131, 'Bloc BAB', 30.0000, '30', 'unité', 50.00, NULL, 32, NULL, 30.00, 2, '2026-02-21 18:19:00', '2026-02-21 18:19:00'),
(428, 131, 'Ciment', 20.0000, '20', 'sac', 240.00, NULL, 14, NULL, 30.00, 3, '2026-02-21 18:19:00', '2026-02-21 18:19:00'),
(429, 131, 'Rocksand 0.2', 3.0000, '3', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 4, '2026-02-21 18:19:00', '2026-02-21 18:19:00'),
(430, 131, 'Macadam 3/8', 3.0000, '3', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 5, '2026-02-21 18:19:01', '2026-02-21 18:19:01'),
(431, 131, 'Carrelage', 1.0000, '1', 'm²', 1700.00, NULL, 33, NULL, 30.00, 6, '2026-02-21 18:19:01', '2026-02-21 18:19:01'),
(432, 131, 'Carreleur', 1.0000, '1', 'm²', 1300.00, NULL, 34, NULL, 30.00, 7, '2026-02-21 18:19:01', '2026-02-21 18:19:01'),
(433, 131, 'Colle Carreau', 4.0000, '4', 'sac', 450.00, NULL, 35, NULL, 30.00, 8, '2026-02-21 18:19:01', '2026-02-21 18:19:01'),
(434, 131, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, NULL, 30.00, 9, '2026-02-21 18:19:02', '2026-02-21 18:19:02'),
(435, 131, 'Joints', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'kg', 250.00, NULL, 37, NULL, 30.00, 10, '2026-02-21 18:19:02', '2026-02-21 18:19:02'),
(436, 133, 'Filtre à Sable', 1.0000, '1', 'unité', 18000.00, NULL, 40, NULL, 30.00, 1, '2026-02-21 18:19:03', '2026-02-21 18:19:03'),
(437, 133, 'Pompe de Piscine', 1.0000, '1', 'unité', 20000.00, NULL, 41, NULL, 30.00, 2, '2026-02-21 18:19:03', '2026-02-21 18:19:03'),
(438, 133, 'Panneau Electrique', 1.0000, '1', 'unité', 9000.00, NULL, 42, NULL, 30.00, 3, '2026-02-21 18:19:03', '2026-02-21 18:19:03'),
(439, 133, 'Électricien', 1.0000, '1', 'jour', 2500.00, NULL, 43, NULL, 30.00, 4, '2026-02-21 18:19:04', '2026-02-21 18:19:04'),
(440, 133, 'Plombier', 1.0000, '1', 'jour', 2500.00, NULL, 44, NULL, 30.00, 5, '2026-02-21 18:19:04', '2026-02-21 18:19:04'),
(441, 134, 'Salt Chlorinateur', 1.0000, '1', 'unité', 35000.00, NULL, 45, NULL, 30.00, 1, '2026-02-21 18:19:05', '2026-02-21 18:19:05'),
(442, 136, 'Carrelage', 1.0000, 'ceil(surface_interieur_m2)', 'm²', 1700.00, NULL, 33, NULL, 30.00, 1, '2026-02-21 18:19:06', '2026-02-21 18:19:06'),
(443, 136, 'Carreleur', 1.0000, 'ceil(surface_interieur_m2)', 'm²', 1300.00, NULL, 34, NULL, 30.00, 2, '2026-02-21 18:19:06', '2026-02-21 18:19:06'),
(444, 136, 'Colle Carreau', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'sac', 450.00, NULL, 35, NULL, 30.00, 3, '2026-02-21 18:19:06', '2026-02-21 18:19:06'),
(445, 136, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, NULL, 30.00, 4, '2026-02-21 18:19:06', '2026-02-21 18:19:06'),
(446, 136, 'Joints', 1.0000, 'CEIL(20 * surface_interieur_m2 / 35)', 'kg', 250.00, NULL, 37, NULL, 30.00, 5, '2026-02-21 18:19:07', '2026-02-21 18:19:07'),
(447, 138, 'Location de JCB', 1.0000, '1', 'jour', 10000.00, NULL, 3, NULL, 30.00, 1, '2026-02-23 05:32:58', '2026-02-23 05:32:58'),
(448, 138, 'Main d\'oeuvre', 1.0000, '0.125 * surface_t_m2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 2, '2026-02-23 05:32:58', '2026-02-23 05:32:58'),
(449, 138, 'Transport de matériaux', 1.0000, 'CEIL(surface_t_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, NULL, 30.00, 3, '2026-02-23 05:32:59', '2026-02-23 05:32:59'),
(450, 138, 'Transport évacuation de la terre', 1.0000, 'CEIL(surface_t_m2 / 15) * 3', 'unité', 4500.00, NULL, 2, NULL, 30.00, 4, '2026-02-23 05:32:59', '2026-02-23 05:32:59'),
(451, 139, 'Main d\'oeuvre', 1.0000, '0.25 * surface_t_m2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:00', '2026-02-23 05:33:00'),
(452, 139, 'Bois', 1.0000, 'CEIL((perimetre_t_m + 4) / 2.4)', 'planche', 250.00, NULL, 10, NULL, 30.00, 2, '2026-02-23 05:33:00', '2026-02-23 05:33:00'),
(453, 139, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, NULL, 30.00, 3, '2026-02-23 05:33:00', '2026-02-23 05:33:00'),
(454, 139, 'Nylon (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 30, NULL, 30.00, 4, '2026-02-23 05:33:00', '2026-02-23 05:33:00'),
(455, 141, 'Location dammeuse', 1.0000, '1', 'jour', 2500.00, NULL, 4, NULL, 30.00, 1, '2026-02-23 05:33:01', '2026-02-23 05:33:01'),
(456, 141, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_t_m2 / 15)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 2, '2026-02-23 05:33:02', '2026-02-23 05:33:02'),
(457, 142, 'Crusherrun', 1.0000, 'ceil(volume_base_t_m3 * 1.6)', 'tonne', 800.00, NULL, 5, NULL, 30.00, 1, '2026-02-23 05:33:02', '2026-02-23 05:33:02'),
(458, 142, 'Fer Y12 pour base', 1.0000, 'ceil((((largeur_ta / 0.2 * (longueur_ta + 1)) + (longueur_ta / 0.2 * (largeur_ta + 1))) * 2)/9)+ceil((((largeur_tb / 0.2 * (longueur_tb + 1)) + (longueur_tb / 0.2 * (largeur_tb + 1))) * 2)/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 2, '2026-02-23 05:33:03', '2026-02-23 05:33:03'),
(459, 142, 'Fer Y12 pour amorce murs', 1.0000, 'ceil(((perimetre_t_m / 0.2) * (profondeur_ta + 1))/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 3, '2026-02-23 05:33:03', '2026-02-23 05:33:03'),
(460, 142, 'Plastique noir', 1.0000, 'surface_t_m2', 'unité', 500.00, NULL, 9, NULL, 30.00, 4, '2026-02-23 05:33:03', '2026-02-23 05:33:03'),
(461, 142, 'Bois de coffrage', 1.0000, 'CEIL(perimetre_base_t_m / 2.4)', 'planche', 250.00, NULL, 10, NULL, 30.00, 5, '2026-02-23 05:33:03', '2026-02-23 05:33:03'),
(462, 142, 'Clous (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 11, NULL, 30.00, 6, '2026-02-23 05:33:04', '2026-02-23 05:33:04'),
(463, 142, 'Fer d\'attache (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 12, NULL, 30.00, 7, '2026-02-23 05:33:04', '2026-02-23 05:33:04'),
(464, 142, 'Transport matériaux', 1.0000, 'CEIL(surface_t_m2 / 15) * 2', 'unité', 4500.00, NULL, 2, NULL, 30.00, 8, '2026-02-23 05:33:04', '2026-02-23 05:33:04'),
(465, 143, 'Main d\'oeuvre', 1.0000, '1', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:05', '2026-02-23 05:33:05'),
(466, 143, 'Béton', 1.0000, 'volume_base_t_m3', 'm³', 5500.00, NULL, 21, NULL, 30.00, 2, '2026-02-23 05:33:05', '2026-02-23 05:33:05'),
(467, 143, 'Eau Béton', 1.0000, '1', 'forfait', 2000.00, NULL, 22, NULL, 30.00, 3, '2026-02-23 05:33:05', '2026-02-23 05:33:05'),
(468, 145, 'Main d\'oeuvre', 1.0000, 'ceil(nb_blocs_bab_t / 75)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:06', '2026-02-23 05:33:06'),
(469, 145, 'Fer Y12 barres verticales', 1.0000, 'ceil((perimetre_t_m / 0.2 * profondeur_ta)/9)', 'barre', 450.00, NULL, 6, NULL, 30.00, 2, '2026-02-23 05:33:07', '2026-02-23 05:33:07'),
(470, 145, 'Fer Y10 barres horizontales', 1.0000, 'ceil(perimetre_t_m * 2 / 9)', 'barre', 300.00, NULL, 7, NULL, 30.00, 3, '2026-02-23 05:33:07', '2026-02-23 05:33:07'),
(471, 145, 'Ciment', 1.0000, 'CEIL((longueur_ta * profondeur_ta * 2 + largeur_ta * profondeur_ta * 2) * 40 / 25 * 1.1)+CEIL((longueur_tb * profondeur_tb * 2 + largeur_tb * profondeur_tb * 2) * 40 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 4, '2026-02-23 05:33:07', '2026-02-23 05:33:07'),
(472, 145, 'Rocksand .4', 1.0000, 'ceil((longueur_ta * profondeur_ta * 2 + largeur_ta * profondeur_ta * 2) * 50 / 1000 * 1.1)+ceil((longueur_tb * profondeur_tb * 2 + largeur_tb * profondeur_tb * 2) * 50 / 1000 * 1.1)', 'tonne', 1100.00, NULL, 15, NULL, 30.00, 5, '2026-02-23 05:33:08', '2026-02-23 05:33:08'),
(473, 145, 'Transport matériaux', 1.0000, 'CEIL(surface_t_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-23 05:33:08', '2026-02-23 05:33:08'),
(474, 146, 'Macadam 3/8', 1.0000, 'ceil(perimetre_t_m * profondeur_ta * 0.15 * 0.8 * 1.1)', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 1, '2026-02-23 05:33:08', '2026-02-23 05:33:08'),
(475, 146, 'Ciment', 1.0000, 'CEIL(perimetre_t_m * profondeur_ta * 0.15 * 350 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 2, '2026-02-23 05:33:09', '2026-02-23 05:33:09'),
(476, 146, 'Rocksand .4', 1.0000, 'ceil(perimetre_t_m * profondeur_ta * 0.15 * 0.4 * 1.5 * 1.1)', 'tonne', 1100.00, NULL, 15, NULL, 30.00, 3, '2026-02-23 05:33:09', '2026-02-23 05:33:09'),
(477, 146, 'Transport matériaux', 1.0000, 'CEIL(surface_t_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 4, '2026-02-23 05:33:09', '2026-02-23 05:33:09'),
(478, 147, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieure_t_m2 / 35)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:10', '2026-02-23 05:33:10'),
(479, 147, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieure_t_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 2, '2026-02-23 05:33:10', '2026-02-23 05:33:10'),
(480, 147, 'Colle Ciment', 1.0000, 'CEIL(surface_interieure_t_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, NULL, 30.00, 3, '2026-02-23 05:33:11', '2026-02-23 05:33:11'),
(481, 147, 'Latex', 1.0000, 'CEIL(surface_interieure_t_m2 / 10)', 'bouteille', 800.00, NULL, 18, NULL, 30.00, 4, '2026-02-23 05:33:11', '2026-02-23 05:33:11'),
(482, 147, 'Ciment', 1.0000, 'CEIL(surface_interieure_t_m2 * 5 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 5, '2026-02-23 05:33:11', '2026-02-23 05:33:11'),
(483, 147, 'Transport Matériaux', 1.0000, 'CEIL(surface_t_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-23 05:33:12', '2026-02-23 05:33:12'),
(484, 148, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieure_t_m2 / 35)', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:12', '2026-02-23 05:33:12'),
(485, 148, 'Rocksand 0.2', 1.0000, 'ceil(surface_interieure_t_m2 * 25 / 1000 * 1.1)', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 2, '2026-02-23 05:33:12', '2026-02-23 05:33:12'),
(486, 148, 'Colle Ciment', 1.0000, 'CEIL(surface_interieure_t_m2 * 2 / 15 * 1.1)', 'sac', 350.00, NULL, 17, NULL, 30.00, 3, '2026-02-23 05:33:13', '2026-02-23 05:33:13'),
(487, 148, 'Latex', 1.0000, 'CEIL(surface_interieure_t_m2 / 10)', 'bouteille', 800.00, NULL, 18, NULL, 30.00, 4, '2026-02-23 05:33:13', '2026-02-23 05:33:13'),
(488, 148, 'Ciment', 1.0000, 'CEIL(surface_interieure_t_m2 * 5 / 25 * 1.1)', 'sac', 240.00, NULL, 14, NULL, 30.00, 5, '2026-02-23 05:33:13', '2026-02-23 05:33:13'),
(489, 148, 'Transport Matériaux', 1.0000, 'CEIL(surface_t_m2 / 15)', 'unité', 4500.00, NULL, 2, NULL, 30.00, 6, '2026-02-23 05:33:14', '2026-02-23 05:33:14'),
(490, 150, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieure_t_m2 / 15) * 2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:15', '2026-02-23 05:33:15'),
(491, 150, 'TAL Sureproof', 1.0000, 'CEIL(surface_interieure_t_m2 / 42) * 7', 'kit', 4500.00, NULL, 19, NULL, 30.00, 2, '2026-02-23 05:33:15', '2026-02-23 05:33:15'),
(492, 150, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, NULL, 30.00, 3, '2026-02-23 05:33:15', '2026-02-23 05:33:15'),
(493, 151, 'Main d\'oeuvre', 1.0000, 'CEIL(surface_interieure_t_m2 / 15) * 2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:16', '2026-02-23 05:33:16'),
(494, 151, 'Pekay Noir', 1.0000, 'CEIL(surface_interieure_t_m2 / 42) * 7', 'm²', 350.00, NULL, 20, NULL, 30.00, 2, '2026-02-23 05:33:16', '2026-02-23 05:33:16'),
(495, 151, 'Pinceau (Forfait)', 1.0000, '1', 'forfait', 300.00, NULL, 31, NULL, 30.00, 3, '2026-02-23 05:33:16', '2026-02-23 05:33:16'),
(496, 153, 'Plombier', 1.0000, 'CEIL(surface_t_m2 / 15) * 2', 'jour', 2500.00, NULL, 44, NULL, 30.00, 1, '2026-02-23 05:33:17', '2026-02-23 05:33:17'),
(497, 153, 'Skimmer', 1.0000, 'CEIL(volume_t_m3 / 36)', 'unité', 7000.00, NULL, 23, NULL, 30.00, 2, '2026-02-23 05:33:18', '2026-02-23 05:33:18'),
(498, 153, 'Traversée de parois', 1.0000, 'CEIL(volume_t_m3 / 36) * 2', 'unité', 1300.00, NULL, 24, NULL, 30.00, 3, '2026-02-23 05:33:18', '2026-02-23 05:33:18'),
(499, 153, 'Buses', 1.0000, 'CEIL(volume_t_m3 / 36) * 2', 'unité', 750.00, NULL, 46, NULL, 30.00, 4, '2026-02-23 05:33:18', '2026-02-23 05:33:18'),
(500, 153, 'Tuyaux 50mm Haute Pression', 1.0000, 'CEIL(perimetre_t_m * 2 / 5.8)', 'unité', 850.00, NULL, 25, NULL, 30.00, 5, '2026-02-23 05:33:18', '2026-02-23 05:33:18'),
(501, 153, 'Colle PVC (Forfait)', 1.0000, '1', 'forfait', 500.00, NULL, 26, NULL, 30.00, 6, '2026-02-23 05:33:19', '2026-02-23 05:33:19'),
(502, 153, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, NULL, 30.00, 7, '2026-02-23 05:33:19', '2026-02-23 05:33:19'),
(503, 154, 'Électricien', 1.0000, 'CEIL(surface_t_m2 / 15) * 2', 'jour', 2500.00, NULL, 43, NULL, 30.00, 1, '2026-02-23 05:33:20', '2026-02-23 05:33:20'),
(504, 154, 'Tuyau spot led', 1.0000, 'CEIL(perimetre_t_m / 5.8)', 'unité', 450.00, NULL, 47, NULL, 30.00, 2, '2026-02-23 05:33:20', '2026-02-23 05:33:20'),
(505, 154, 'Câbles électriques 2.5mm² 3 cors', 1.0000, 'ceil(perimetre_t_m)', 'mètre', 150.00, NULL, 27, NULL, 30.00, 3, '2026-02-23 05:33:20', '2026-02-23 05:33:20'),
(506, 154, 'Boite de connexion electrique', 1.0000, 'CEIL(perimetre_t_m / 5.8)', 'unité', 350.00, NULL, 28, NULL, 30.00, 4, '2026-02-23 05:33:21', '2026-02-23 05:33:21'),
(507, 154, 'Transport matériaux', 1.0000, '1', 'unité', 4500.00, NULL, 2, NULL, 30.00, 5, '2026-02-23 05:33:21', '2026-02-23 05:33:21'),
(508, 156, 'Spot Led', 1.0000, '1', 'unité', 11000.00, NULL, 29, NULL, 30.00, 1, '2026-02-23 05:33:22', '2026-02-23 05:33:22'),
(509, 157, 'Pompe de Circulation', 1.0000, '1', 'unité', 20000.00, NULL, 38, NULL, 30.00, 1, '2026-02-23 05:33:23', '2026-02-23 05:33:23'),
(510, 157, 'Domotique', 1.0000, '1', 'unité', 25000.00, NULL, 39, NULL, 30.00, 2, '2026-02-23 05:33:23', '2026-02-23 05:33:23'),
(511, 159, 'Main d\'oeuvre', 2.0000, '2', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:24', '2026-02-23 05:33:24'),
(512, 159, 'Bloc BAB', 20.0000, '20', 'unité', 50.00, NULL, 32, NULL, 30.00, 2, '2026-02-23 05:33:24', '2026-02-23 05:33:24'),
(513, 159, 'Ciment', 10.0000, '10', 'sac', 240.00, NULL, 14, NULL, 30.00, 3, '2026-02-23 05:33:24', '2026-02-23 05:33:24'),
(514, 159, 'Rocksand 0.2', 2.0000, '2', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 4, '2026-02-23 05:33:25', '2026-02-23 05:33:25'),
(515, 159, 'Macadam 3/8', 2.0000, '2', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 5, '2026-02-23 05:33:25', '2026-02-23 05:33:25'),
(516, 159, 'Carrelage', 1.0000, '1', 'm²', 1700.00, NULL, 33, NULL, 30.00, 6, '2026-02-23 05:33:25', '2026-02-23 05:33:25'),
(517, 159, 'Carreleur', 1.0000, '1', 'm²', 1300.00, NULL, 34, NULL, 30.00, 7, '2026-02-23 05:33:26', '2026-02-23 05:33:26'),
(518, 159, 'Colle Carreau', 2.0000, '2', 'sac', 450.00, NULL, 35, NULL, 30.00, 8, '2026-02-23 05:33:26', '2026-02-23 05:33:26'),
(519, 160, 'Main d\'oeuvre', 5.0000, '5', 'jour', 2500.00, NULL, 1, NULL, 30.00, 1, '2026-02-23 05:33:27', '2026-02-23 05:33:27'),
(520, 160, 'Bloc BAB', 30.0000, '30', 'unité', 50.00, NULL, 32, NULL, 30.00, 2, '2026-02-23 05:33:27', '2026-02-23 05:33:27'),
(521, 160, 'Ciment', 20.0000, '20', 'sac', 240.00, NULL, 14, NULL, 30.00, 3, '2026-02-23 05:33:27', '2026-02-23 05:33:27'),
(522, 160, 'Rocksand 0.2', 3.0000, '3', 'tonne', 1200.00, NULL, 16, NULL, 30.00, 4, '2026-02-23 05:33:27', '2026-02-23 05:33:27'),
(523, 160, 'Macadam 3/8', 3.0000, '3', 'tonne', 1800.00, NULL, 13, NULL, 30.00, 5, '2026-02-23 05:33:28', '2026-02-23 05:33:28'),
(524, 160, 'Carrelage', 1.0000, '1', 'm²', 1700.00, NULL, 33, NULL, 30.00, 6, '2026-02-23 05:33:28', '2026-02-23 05:33:28');
INSERT INTO `boq_lines` (`id`, `category_id`, `description`, `quantity`, `quantity_formula`, `unit`, `unit_cost_ht`, `unit_cost_formula`, `price_list_id`, `supplier_id`, `margin_percent`, `display_order`, `created_at`, `updated_at`) VALUES
(525, 160, 'Carreleur', 1.0000, '1', 'm²', 1300.00, NULL, 34, NULL, 30.00, 7, '2026-02-23 05:33:28', '2026-02-23 05:33:28'),
(526, 160, 'Colle Carreau', 4.0000, '4', 'sac', 450.00, NULL, 35, NULL, 30.00, 8, '2026-02-23 05:33:29', '2026-02-23 05:33:29'),
(527, 160, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, NULL, 30.00, 9, '2026-02-23 05:33:29', '2026-02-23 05:33:29'),
(528, 160, 'Joints', 1.0000, 'CEIL(20 * surface_interieure_t_m2 / 35)', 'kg', 250.00, NULL, 37, NULL, 30.00, 10, '2026-02-23 05:33:29', '2026-02-23 05:33:29'),
(529, 162, 'Filtre à Sable', 1.0000, '1', 'unité', 18000.00, NULL, 40, NULL, 30.00, 1, '2026-02-23 05:33:30', '2026-02-23 05:33:30'),
(530, 162, 'Pompe de Piscine', 1.0000, '1', 'unité', 20000.00, NULL, 41, NULL, 30.00, 2, '2026-02-23 05:33:30', '2026-02-23 05:33:30'),
(531, 162, 'Panneau Electrique', 1.0000, '1', 'unité', 9000.00, NULL, 42, NULL, 30.00, 3, '2026-02-23 05:33:31', '2026-02-23 05:33:31'),
(532, 162, 'Électricien', 1.0000, '1', 'jour', 2500.00, NULL, 43, NULL, 30.00, 4, '2026-02-23 05:33:31', '2026-02-23 05:33:31'),
(533, 162, 'Plombier', 1.0000, '1', 'jour', 2500.00, NULL, 44, NULL, 30.00, 5, '2026-02-23 05:33:31', '2026-02-23 05:33:31'),
(534, 163, 'Salt Chlorinateur', 1.0000, '1', 'unité', 35000.00, NULL, 45, NULL, 30.00, 1, '2026-02-23 05:33:32', '2026-02-23 05:33:32'),
(535, 165, 'Carrelage', 1.0000, 'ceil(surface_interieure_t_m2)', 'm²', 1700.00, NULL, 33, NULL, 30.00, 1, '2026-02-23 05:33:33', '2026-02-23 05:33:33'),
(536, 165, 'Carreleur', 1.0000, 'ceil(surface_interieure_t_m2)', 'm²', 1300.00, NULL, 34, NULL, 30.00, 2, '2026-02-23 05:33:33', '2026-02-23 05:33:33'),
(537, 165, 'Colle Carreau', 1.0000, 'CEIL(20 * surface_interieure_t_m2 / 35)', 'sac', 450.00, NULL, 35, NULL, 30.00, 3, '2026-02-23 05:33:33', '2026-02-23 05:33:33'),
(538, 165, 'Tiles Spacers (Forfait)', 1.0000, '1', 'forfait', 200.00, NULL, 36, NULL, 30.00, 4, '2026-02-23 05:33:34', '2026-02-23 05:33:34'),
(539, 165, 'Joints', 1.0000, 'CEIL(20 * surface_interieure_t_m2 / 35)', 'kg', 250.00, NULL, 37, NULL, 30.00, 5, '2026-02-23 05:33:34', '2026-02-23 05:33:34'),
(540, 116, 'Blocs BAB', 1.0000, 'nb_blocs_bab_l', 'unité', 0.00, '50', 32, NULL, 30.00, 0, '2026-02-23 06:07:19', '2026-02-23 06:07:19'),
(541, 166, 'Location d\'un JCB (1 jour)', 1.0000, NULL, 'jour', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(542, 166, 'Main d\'oeuvre', 6.0000, NULL, 'jour', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(543, 166, 'Ciment', 15.0000, NULL, 'unité', 180.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(544, 166, 'Rocksand', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(545, 166, 'Macadam', 3.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(546, 166, 'Transport', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(547, 166, 'Evacuation du surplus de terre et roches', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(548, 167, '2 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), Toit en 2 pentes en Tole, avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 2.0000, NULL, 'unité', 350000.00, NULL, NULL, 5, 30.00, 0, '2026-02-23 14:30:07', '2026-02-24 16:22:05'),
(549, 168, '1 x Porte Coullissante 3500mm', 1.0000, NULL, 'unité', 60000.00, NULL, NULL, 20, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:54:04'),
(550, 168, '1 x Fenêtre dans la salle de bain 500mm x 500mm', 1.0000, NULL, 'unité', 4000.00, NULL, NULL, 20, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:54:12'),
(551, 168, '1 x Fenêtre dans la cuisine et 1 dans le salon 1100mm x 1100mm', 2.0000, NULL, 'unité', 18000.00, NULL, NULL, 20, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:54:21'),
(552, 169, 'Panneau électrique', 1.0000, NULL, 'unité', 2000.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:50:52'),
(553, 169, 'Breakers', 4.0000, NULL, 'unité', 600.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:51:03'),
(554, 169, 'RCD 63A', 1.0000, NULL, 'unité', 2500.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:51:20'),
(555, 169, 'Isolateur 63A', 1.0000, NULL, 'unité', 2000.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:51:33'),
(556, 169, 'Lumieres Plafond', 6.0000, NULL, 'unité', 300.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:51:54'),
(557, 169, 'Prises Doubles', 5.0000, NULL, 'unité', 900.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:52:06'),
(558, 169, 'Prise 16A', 4.0000, NULL, 'unité', 800.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:52:20'),
(559, 169, 'Prise Etanche 16A', 1.0000, NULL, 'unité', 1500.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:52:37'),
(560, 169, 'Fils Electriques', 1.0000, NULL, 'forfait', 10000.00, NULL, NULL, 6, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:52:50'),
(561, 169, 'Electricien', 1.0000, NULL, 'forfait', 20000.00, NULL, NULL, 8, 30.00, 0, '2026-02-23 14:30:07', '2026-03-02 07:53:02'),
(562, 170, 'Porte en bois de 750mm pour la salle de bain', 1.0000, NULL, 'unité', 22000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(563, 171, 'Couche de béton autonivellant (1 a 8mm)', 30.0000, NULL, 'm²', 1500.00, NULL, NULL, 12, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:38:10'),
(564, 171, 'Main d\'Oeuvre (Béton et SPC)', 6.0000, NULL, 'jour', 2500.00, NULL, NULL, 4, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:38:30'),
(565, 171, 'SPC & Plynthes (inc Installation)', 30.0000, NULL, 'm²', 1200.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:38:50'),
(566, 172, 'Camion Conteneur', 3.0000, NULL, 'unité', 12500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:39:41'),
(567, 173, 'Parpaings 200mm', 120.0000, NULL, 'unité', 35.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(568, 173, 'Parpaing U 200mm', 60.0000, NULL, 'unité', 60.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(569, 173, 'Rocksand 0.2', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(570, 173, 'Macadam ½', 2.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(571, 173, 'Transport', 1.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(572, 173, 'Main d\'Oeuvre', 5.0000, NULL, 'jour', 5000.00, NULL, NULL, 2, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(573, 173, 'Barres Y10', 1.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(575, 175, 'Table/Rangement pour la Salle de bain', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(576, 175, 'Placard', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(577, 175, 'Lit de 1m90 x 1.35', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(578, 175, 'Miroir', 1.0000, NULL, 'unité', 4000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(579, 175, 'Table de Chevet', 2.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(580, 176, 'Réservoir d\'Eau 500 lts', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(581, 176, 'Fosse Septique Polyéthylène enterrée 2000 Lts', 1.0000, NULL, 'unité', 24000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(582, 176, 'Bac à Graisse', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(583, 176, 'Pompe à Eau - approx 450w + Control Automatique', 1.0000, NULL, 'unité', 6000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(584, 176, 'Tuyaux & Coude', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(585, 176, 'Fouille (JCB - 1 jour)', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(586, 176, 'Camion pour évacuation des déchets', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(587, 176, 'Camion Matériaux', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(588, 176, 'Rocksand', 10.0000, NULL, 'tonne', 650.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(589, 176, 'Plombier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(590, 176, 'Jardinier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(591, 176, 'Couvercle de Pompe', 1.0000, NULL, 'unité', 3500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(592, 177, 'Table de 2.5m de long\n• Meuble suspendu', 1.0000, NULL, 'unité', 110000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:55:11'),
(593, 178, 'Réfrigérateur 208 Lts approx.', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(594, 178, 'Hotte Aspirante 60 cm', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(595, 178, 'Plaque électrique 2 feux', 1.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(596, 178, 'Micro-onde (20 Lts)', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(597, 178, 'Machine à laver le linge (7Kg)', 1.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(598, 178, 'Chauffe-eau électrique (7Kw Instantané)', 1.0000, NULL, 'unité', 8500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(599, 178, 'Climatiseur 12000 BTU', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(600, 178, 'TV Smart 32\"', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(601, 179, 'Toilette', 1.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(602, 179, 'Carrelage dans la cabine de douche (Choix du carrelage avant la production selon budget)', 1.0000, NULL, 'unité', 25000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(603, 179, 'Lavabo & Robinet', 1.0000, NULL, 'unité', 9000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(604, 179, 'Mitigeur de douche', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(605, 179, 'Plombier', 2.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(606, 180, 'Structure en Metal', 1.0000, NULL, 'unité', 80000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:57:03'),
(607, 180, 'Decking en composite (Choix de couleur avant la production)', 1.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:30:07'),
(608, 180, 'Toles (Choix de couleur avant la production)', 8.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:30:07', '2026-02-23 14:56:47'),
(609, 168, '2 x Fenêtres dans la chambre 500mm x 1100mm', 2.0000, NULL, 'unité', 15000.00, NULL, NULL, 20, 30.00, 0, '2026-02-23 14:36:11', '2026-03-02 07:54:32'),
(610, 170, 'Porte Coulissante galendage en bois 2m50', 1.0000, NULL, 'unité', 80000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-23 14:37:39', '2026-02-23 14:37:39'),
(611, 179, 'Carreleur', 1.0000, NULL, 'forfait', 10000.00, NULL, NULL, 10, 30.00, 0, '2026-02-23 14:56:01', '2026-02-23 14:56:01'),
(612, 181, 'Location d\'un JCB (1 jour)', 2.0000, NULL, 'jour', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:40:39'),
(613, 181, 'Main d\'oeuvre', 10.0000, NULL, 'jour', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:41:43'),
(614, 181, 'Ciment', 40.0000, NULL, 'unité', 180.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:42:11'),
(615, 181, 'Rocksand', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(616, 181, 'Macadam', 3.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(617, 181, 'Transport', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:12:46'),
(618, 181, 'Evacuation du surplus de terre et roches', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:12:58'),
(619, 182, '3 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), 1 Toit à 2 pentes et 2 Toits à 1 pente en Tole,avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 3.0000, NULL, 'unité', 350000.00, NULL, NULL, 5, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:22:56'),
(621, 183, '3 x Fenêtres dans les salles de bain 500mm x 500mm', 3.0000, NULL, 'unité', 4000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:36:27'),
(623, 183, '1 x Fenêtre dans la cuisine de 500mm x 1100mm et 2 x Fenêtres dans la chambre de 500mm x 1100mm et', 3.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:39:00'),
(624, 184, 'Panneau électrique', 1.0000, NULL, 'unité', 3500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:30:02'),
(625, 184, 'Breakers', 6.0000, NULL, 'unité', 600.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:30:27'),
(626, 184, 'RCD 63A', 1.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(627, 184, 'Isolateur 63A', 1.0000, NULL, 'unité', 2000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(628, 184, 'Lumieres Plafond', 11.0000, NULL, 'unité', 300.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:30:49'),
(629, 184, 'Prises Doubles', 5.0000, NULL, 'unité', 900.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(630, 184, 'Prise 16A', 8.0000, NULL, 'unité', 800.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:31:55'),
(631, 184, 'Prise Etanche 16A', 2.0000, NULL, 'unité', 1500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:32:11'),
(632, 184, 'Fils Electriques', 1.0000, NULL, 'forfait', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:33:05'),
(633, 184, 'Electricien', 1.0000, NULL, 'forfait', 20000.00, NULL, NULL, 3, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:33:40'),
(634, 185, 'Porte en bois de 800mm pour les salles de bain et les 2 chambres', 6.0000, NULL, 'unité', 24000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:40:32'),
(635, 185, 'Porte Coulissante galendage en bois 2m50', 1.0000, NULL, 'unité', 64500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:50:27'),
(636, 186, 'Couche de béton autonivellant (1 a 8mm)', 45.0000, NULL, 'm²', 1500.00, NULL, NULL, 12, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:41:00'),
(637, 186, 'Main d\'Oeuvre (Béton et SPC)', 9.0000, NULL, 'jour', 2500.00, NULL, NULL, 4, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:41:17'),
(638, 186, 'SPC & Plynthes (inc Installation)', 45.0000, NULL, 'm²', 1200.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:41:28'),
(639, 187, 'Camion Conteneur', 6.0000, NULL, 'unité', 12500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:43:53'),
(640, 188, 'Parpaings 200mm', 150.0000, NULL, 'unité', 35.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:13:32'),
(641, 188, 'Parpaing U 200mm', 100.0000, NULL, 'unité', 60.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:13:47'),
(642, 188, 'Rocksand 0.2', 6.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:14:03'),
(643, 188, 'Macadam ½', 2.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(644, 188, 'Transport', 2.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:14:13'),
(645, 188, 'Main d\'Oeuvre', 7.0000, NULL, 'jour', 5000.00, NULL, NULL, 2, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:14:27'),
(646, 188, 'Barres Y10', 2.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 16:14:40'),
(647, 189, 'Table/Rangement pour la Salle de bain + miroir', 3.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:49:07'),
(648, 189, 'Placard', 3.0000, NULL, 'unité', 26500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:48:49'),
(649, 189, 'Lit de 1m90 x 1.35', 3.0000, NULL, 'unité', 27500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:47:58'),
(651, 189, 'Table de Chevet', 5.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:49:39'),
(652, 190, 'Réservoir d\'Eau 500 lts', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(653, 190, 'Fosse Septique Polyéthylène enterrée 2000 Lts', 1.0000, NULL, 'unité', 24000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(654, 190, 'Bac à Graisse', 1.0000, NULL, 'unité', 6500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(655, 190, 'Pompe à Eau - approx 450w + Control Automatique', 1.0000, NULL, 'unité', 6000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(656, 190, 'Tuyaux & Coude', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(657, 190, 'Fouille (JCB - 1 jour)', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(658, 190, 'Camion pour évacuation des déchets', 1.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(659, 190, 'Camion Matériaux', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(660, 190, 'Rocksand', 10.0000, NULL, 'tonne', 650.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(661, 190, 'Plombier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(662, 190, 'Jardinier', 3.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(663, 190, 'Couvercle de Pompe', 1.0000, NULL, 'unité', 3500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(664, 191, 'Table de 2.5m de long\n• Meuble suspendu', 1.0000, NULL, 'unité', 115000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:49:55'),
(665, 192, 'Réfrigérateur 208 Lts approx.', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(666, 192, 'Hotte Aspirante 60 cm', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(667, 192, 'Plaque électrique 2 feux', 1.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(668, 192, 'Micro-onde (20 Lts)', 1.0000, NULL, 'unité', 6000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:51:21'),
(669, 192, 'Machine à laver le linge (7Kg)', 1.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(670, 192, 'Chauffe-eau électrique (7Kw Instantané)', 1.0000, NULL, 'unité', 18000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:44:29'),
(671, 192, 'Climatiseur 12000 BTU', 3.0000, NULL, 'unité', 18000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:51:59'),
(672, 192, 'TV Smart 32\"', 1.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(673, 193, 'Toilette', 3.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:35:50'),
(674, 193, 'Carrelage dans la cabine de douche (Choix du carrelage avant la production selon budget)', 3.0000, NULL, 'unité', 16000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:53:18'),
(675, 193, 'Lavabo & Robinet', 3.0000, NULL, 'unité', 9000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:36:16'),
(676, 193, 'Mitigeur de douche', 3.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:36:28'),
(677, 193, 'Plombier', 2.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-03-01 14:53:57'),
(678, 193, 'Carreleur', 3.0000, NULL, 'forfait', 10000.00, NULL, NULL, 10, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:37:00'),
(679, 194, 'Structure en Metal', 2.0000, NULL, 'unité', 80000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:37:36'),
(680, 194, 'Decking en composite (Choix de couleur avant la production)', 15.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 15:38:12'),
(681, 194, 'Toles (Choix de couleur avant la production)', 8.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:29:44', '2026-02-24 14:29:44'),
(682, 183, 'Panneaux fixes (Terrasse)', 2.0000, NULL, 'unité', 15000.00, NULL, NULL, NULL, 30.00, 0, '2026-02-24 14:34:30', '2026-02-24 14:34:30'),
(683, 183, '1 Porte Galendage 2000 x 2100 mm (Salle à Manger)', 1.0000, NULL, 'unité', 41000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:36:21', '2026-03-01 14:36:21'),
(684, 183, '2 x Panneaux Fixe 2000 x 2100mm (Salle à Manger)', 2.0000, NULL, 'unité', 12800.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:37:53', '2026-03-01 14:37:53'),
(685, 183, '2 Portes Coullissantes 3 vantaux 3500 x 2100 mm (Chambres)', 2.0000, NULL, 'unité', 51500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:39:42', '2026-03-01 14:39:42'),
(686, 183, '2 Portes Coullissantes 2300 x 2100 mm (Chambres)', 2.0000, NULL, 'unité', 32000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:40:58', '2026-03-01 14:40:58'),
(687, 183, 'Transport', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:44:13', '2026-03-01 14:44:13'),
(688, 191, 'Plombier', 1.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:54:31', '2026-03-01 14:54:31'),
(689, 191, 'Evier', 1.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:55:06', '2026-03-01 14:55:06'),
(690, 191, 'Tuyaux et Accessoires', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:55:24', '2026-03-01 14:55:24'),
(691, 191, 'Melangeur Eau', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 14:55:50', '2026-03-01 14:55:50'),
(692, 195, 'Location d\'un JCB (1 jour)', 2.0000, NULL, 'jour', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(693, 195, 'Main d\'oeuvre', 10.0000, NULL, 'jour', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(694, 195, 'Ciment', 40.0000, NULL, 'unité', 180.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(695, 195, 'Rocksand', 3.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(696, 195, 'Macadam', 3.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(697, 195, 'Transport', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(698, 195, 'Evacuation du surplus de terre et roches', 2.0000, NULL, 'unité', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(699, 196, '2 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), 2 Toits à 1 pente en Tole,avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 2.0000, NULL, 'unité', 350000.00, NULL, NULL, 5, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:33:01'),
(700, 197, '2 x Fenêtres dans les salles de bain 500mm x 500mm', 2.0000, NULL, 'unité', 4000.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:32'),
(702, 197, 'Panneaux fixes (Terrasse)', 2.0000, NULL, 'unité', 15000.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:41'),
(703, 197, '1 Porte Galendage 2000 x 2100 mm (Salle à Manger)', 1.0000, NULL, 'unité', 41000.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:50'),
(704, 197, '2 x Panneaux Fixe 2000 x 2100mm (Salle à Manger)', 2.0000, NULL, 'unité', 12800.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:57:08'),
(705, 197, '2 Portes Coullissantes 3 vantaux 3500 x 2100 mm (Chambres)', 2.0000, NULL, 'unité', 51500.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:57:19'),
(706, 197, '2 Portes Coullissantes 2300 x 2100 mm (Chambres)', 2.0000, NULL, 'unité', 32000.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:57:30'),
(707, 197, 'Transport', 1.0000, NULL, 'unité', 5000.00, NULL, NULL, 20, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:57:41'),
(712, 198, '8 x Lumières Plafond', 8.0000, NULL, 'unité', 300.00, NULL, NULL, 6, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:55:29'),
(713, 198, '2 x Prises Doubles', 2.0000, NULL, 'unité', 900.00, NULL, NULL, 6, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:55:41'),
(714, 198, '4 x Prise 16A', 4.0000, NULL, 'unité', 800.00, NULL, NULL, 6, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:55:50'),
(715, 198, '2 x Prises Etanches 16A', 2.0000, NULL, 'unité', 1500.00, NULL, NULL, 6, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:00'),
(716, 198, 'Fils Electriques', 1.0000, NULL, 'forfait', 10000.00, NULL, NULL, 6, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:09'),
(717, 198, 'Electricien', 1.0000, NULL, 'forfait', 20000.00, NULL, NULL, 8, 30.00, 0, '2026-03-01 15:01:35', '2026-03-02 07:56:19'),
(718, 199, '4 x Portes en bois de 800mm pour les salles de bain et les 2 chambres', 4.0000, NULL, 'unité', 24000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:05:36'),
(720, 200, 'Couche de béton autonivellant (1 a 8mm)', 30.0000, NULL, 'm²', 1500.00, NULL, NULL, 12, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:06:08'),
(721, 200, 'Main d\'Oeuvre (Béton et SPC)', 6.0000, NULL, 'jour', 2500.00, NULL, NULL, 4, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:06:20'),
(722, 200, 'SPC & Plynthes (inc Installation)', 30.0000, NULL, 'm²', 1200.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:06:31'),
(723, 201, 'Camion Conteneur', 4.0000, NULL, 'unité', 12500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:07:04'),
(725, 202, 'Parpaing U 200mm', 100.0000, NULL, 'unité', 60.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(726, 202, 'Rocksand 0.2', 6.0000, NULL, 'tonne', 970.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(727, 202, 'Macadam ½', 2.0000, NULL, 'tonne', 700.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(728, 202, 'Transport', 2.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(729, 202, 'Main d\'Oeuvre', 7.0000, NULL, 'jour', 5000.00, NULL, NULL, 2, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:22:43'),
(730, 202, 'Barres Y10', 2.0000, NULL, 'forfait', 4500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(731, 203, '2 Meubles pour les Salles de bain + miroirs', 2.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:35:39'),
(732, 203, '2 x Placards', 2.0000, NULL, 'unité', 26500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:07:58'),
(733, 203, '2 x Lits de 1m90 x 1.35', 2.0000, NULL, 'unité', 27500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:08:19'),
(734, 203, '4 x Tables de Chevet', 4.0000, NULL, 'unité', 7500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:08:39'),
(758, 206, '2 x Climatiseurs 12000 BTU', 2.0000, NULL, 'unité', 18000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:10:30'),
(760, 207, '2 x Toilettes', 2.0000, NULL, 'unité', 8000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:35:54'),
(761, 207, 'Carrelage dans les 2 cabines de douche (Choix du carrelage avant la production selon budget)', 2.0000, NULL, 'unité', 16000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:36:18'),
(762, 207, '2 x Lavabos & Robinets', 2.0000, NULL, 'unité', 9000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:36:33'),
(763, 207, '2 x Mitigeurs de douche', 2.0000, NULL, 'unité', 10000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:36:45'),
(764, 207, 'Plombier', 2.0000, NULL, 'unité', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(765, 207, 'Carreleur', 2.0000, NULL, 'forfait', 10000.00, NULL, NULL, 10, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:25:12'),
(766, 208, 'Structure en Metal', 2.0000, NULL, 'unité', 60000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:11:21'),
(767, 208, 'Decking en composite (Choix de couleur avant la production)', 15.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(768, 208, 'Toles (Choix de couleur avant la production)', 8.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:01:35', '2026-03-01 15:01:35'),
(769, 202, 'Decking en composite (Choix de couleur avant la production)', 33.0000, NULL, 'unité', 3000.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:17:29', '2026-03-01 15:17:29'),
(770, 202, 'Poutres de support en metal galvanisé', 22.0000, NULL, 'unité', 1200.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:22:02', '2026-03-01 15:22:02'),
(771, 202, 'Ferrailleur', 4.0000, NULL, 'jour', 2500.00, NULL, NULL, NULL, 30.00, 0, '2026-03-01 15:23:07', '2026-03-01 15:23:07');

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `device_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('new','read','replied','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `name`, `email`, `phone`, `address`, `subject`, `message`, `device_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Sanjiv Luckea', 'vmamet@icloud.com', '+23052544544', 'Pointe aux biches', NULL, NULL, 'device_012bb96f-dc2c-49af-9bed-cc05b43f0eac', 'new', '2026-02-08 03:56:08', '2026-03-01 15:31:13'),
(2, 'Pascale Mamet', 'casnouce@hotmail.com', '54221025', 'Pavillon', NULL, NULL, NULL, 'new', '2026-02-12 14:46:34', '2026-02-12 14:46:34'),
(3, 'Albert Mamet', 'albertmamet47@gmail.com', '57133155', 'Cottage', NULL, NULL, 'device_5331fe75-2f5d-47d1-94dd-6b06ab305a4b', 'new', '2026-02-17 12:44:28', '2026-02-17 12:44:28'),
(4, 'Jean Eric Basraz', 'mrbcreative0987@gmail.com', '57213823', 'Grand Gaube', NULL, NULL, 'device_012bb96f-dc2c-49af-9bed-cc05b43f0eac', 'new', '2026-02-23 05:36:58', '2026-02-23 05:36:58'),
(5, 'Sanjiv Luckea', 'sanjiv.luckhea13@gmail.com', '+44 7847 394321', 'Pointe aux biches', NULL, NULL, 'device_012bb96f-dc2c-49af-9bed-cc05b43f0eac', 'new', '2026-03-01 15:39:18', '2026-03-01 16:06:06');

-- --------------------------------------------------------

--
-- Table structure for table `db_schema_version`
--

CREATE TABLE `db_schema_version` (
  `id` int NOT NULL DEFAULT '1',
  `version` varchar(20) NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `db_schema_version`
--

INSERT INTO `db_schema_version` (`id`, `version`, `applied_at`) VALUES
(1, '2.3.0', '2026-03-02 10:21:01');

-- --------------------------------------------------------

--
-- Table structure for table `development_ideas`
--

CREATE TABLE `development_ideas` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `script` text COLLATE utf8mb4_unicode_ci,
  `statut` enum('non_demarree','en_cours','completee') COLLATE utf8mb4_unicode_ci DEFAULT 'non_demarree',
  `urgence` enum('urgent','non_urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'non_urgent',
  `importance` enum('important','non_important') COLLATE utf8mb4_unicode_ci DEFAULT 'non_important',
  `priority_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `development_ideas`
--

INSERT INTO `development_ideas` (`id`, `name`, `script`, `statut`, `urgence`, `importance`, `priority_order`, `created_at`, `updated_at`) VALUES
(1, 'Devis -> Facture', 'On doit pouvoir convertir un devis en \"Pro-Forma Invoice\" puis une Pro-Forma Invoice en Facture VAT.\nOn doit pouvoir modifier les details des proforma et des factures vat avant leur validation.\nDans l\'interface devis dans l\'admin, mettre un bouton \"Convert to Pro-Forma\", cela devra automatiquement Valider le devis et creer une ligne dans l\'interface Pro-Forma (Afficher son bouton menu sous devis), creer un PFI-yyyymm-Temp-xx avec tous les details du devis. Une fois le proforma validé, la ref changera pour PFI-yyyymm-xxxxx\nQuand on ouvre la proforma, il faut des bouton \"Re-Ouvrir\" (qui remet le proforma en \"Temporaire\", un bouton Creer une facture VAT, et un bouton \" Effacer (avec message de confirmation)\nTous ces documents doivent pouvoir etre envoyé aux clients avec un message type pris d\'un template et avec le document en attachement en PDF (Parametrable dans la section Email dans un TAB PDF Documents)', 'non_demarree', 'non_urgent', 'important', 1, '2026-02-08 06:30:51', '2026-02-10 05:02:31'),
(2, 'Professionnel peuvent faire devis moyennant monetisation', 'L\'idee ici est de proposer a des professionnels comme des constructeurs de piscine ou vendeurs de conteneur d\'utiliser ma plateforme pour faire leur propre devis (Avec les infos de leur societe) Ils auraient une interface similaire mais qu\'ils ouvriraient depuis leur site web. Quand je creer un utilisateur professionnel sur sunbox-mauritius.com, cela me donnera un lien pour telecharger un zip de deploiement sur leur domaine qui sera heberger sur le meme serveur mais sous un autre domaine.\nLeur interface admin aura le dashboard, les devis, les utilisateurs, les paramettre de leur site (avec 1 champ en plus .... marge sur le prix pro de sunbox. Sachant que Sunbox partagera un % de son profit avec l\'utilisateur pro ... il pourra s\'il le souhaite majorer ce prix preferentiel ou non)\nLe professionnel achete un PACK de 10000 Rs mensuel non remboursable.\nA chaque fois qu\'il fait un devis, 500 Rs sont deduis peut importe le statut du devis. Il ne verra que le resumé du devis, c\'est a dire un montant total. A chaque fois qu\'il valide le devis, cela creer son devis qu\'il peut envoyer par email a son client (VIA un SMTP Dedié Global pour les professionnels ... pas celui di site) et cela deduit 1000 Rs. Il peut aussi demander le BOQ détaillé afin d\'avoir sa liste de commande de materiaux et service. Des lors qu\'il fait cette requete, 1500 Rs sera de nouveau coupé de ses credits. Quand ses credits sont insuffisants, il peut acheter un nouveau PACK pour continuer ses devis. Il doit pouvoir gerer ses informations utilisateur, client, changer son mot de passe, changer son logo, adresse, No de TVA, de BRN, Tel Phone etc ...). Si un devis est confirmé et qu\'on lance la production, le 10000 Rs du pack est deduis de sa facture.\nIl faut aussi un moyen pour un utilisateur professionnel de demander le prix d\'un nouveau modele et un plan 3D. Il devra avoir un textbox pour expliquer ce qu\'il recherche, remplir un formulaire avec le nom de containeur de 20\' et de 40\', le nombre de chambre, avec combien de salle de bain, et il devra pouvoir envoyer un JPG d\'un croquis.\nCela lui coutera 3000 Rs dans ses crédits.\nIl faudra pour cela creer une interface de gestion des utilisateurs soius parametres (Vendeurs, Admin, Public (Contacts), Professionels (Qui vont utiliser la plateforme pour faire leur devis)\n', 'en_cours', 'non_urgent', 'important', 2, '2026-02-08 06:31:31', '2026-02-25 18:13:41'),
(3, 'Devis Manuel depuis le BOQ', 'On doit pouvoir creer un devis libre ou rattaché a un model de conteneur. Pas de piscine.\nUniquement pour les admin depuis la page Devis avec un bouton nouveau devis.\nPour le devis libre, Le mode de fonctionnement est comme le BOQ, on rajoute des categories avec des lignes et le qté, unité, cout unitaire ht et cout total HT)\nL\'admin peut changer la marge qui est par defaut 30%\non doit pouvoir afficher une photo et un plan sur le devis ... mais ce n\'est pas obligatoire.\nConcernant les devis depuis les modeles, utiliser le meme process que les devis cree par le public. La seule difference est que l\'on doit pouvoir charger un client depuis contacts, on doit pouvoir cloner des devis existant et les modifier.\nStatus par default draft -> open -> validé (creer la ref), et annulé ', 'completee', 'urgent', 'important', 3, '2026-02-08 06:31:51', '2026-02-16 04:51:01'),
(4, 'Gestion des utilisateurs', '(Vendeurs, Admin, Public (Contacts), Professionels (Qui vont utiliser la plateforme pour faire leur devis)', 'completee', 'non_urgent', 'non_important', 4, '2026-02-08 06:59:34', '2026-02-25 18:12:45'),
(5, 'Envois de email - Beguggage', 'Quand je test l\'envois de email depuis l\'interface email dans l\'admin, j\'ai une erreur :\nErreur d\'envois PHPmailer is not installed. Run:composer require phpmailer/phpmailer\nLe dev tool. de chrome donne ces erreurs :\nWarning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.\n(anonymous) @ index-DVt0EICU.js:442Understand this warning\n/api/email.php?action=test:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)\nLe site est hebergé sur a2hosting.com et a phpmailer\nPeut etre utiliser un autre protocol ... Les email sont hebergé sur google workspace.', 'completee', 'urgent', 'important', 5, '2026-02-08 07:00:08', '2026-02-08 07:49:33'),
(6, 'Devis Piscine depuis BOQ Piscine', 'Les modeles de piscine devront utiliser les BOQs piscine pour calculer dynamiquement le devis en utilisant des variables et des formules de calcul.\nLe client remplis un formulaire : Longueur, Largeur, Profondeur\nLes BOQs Piscine utilise des catégories predefinnies suivant les etapes de construction : (Utiliser le meme principe que le BOQ des conteneurs avec les lignes dans les categories, mais ici, il y aura des sous-categorie)\n\nVariables de calcul : (Doit etre dans un tableau de parametrage. On doit pouvoir changer les formules en utilisant les variables)\nSurface M2 = Longeur x Largeur\nVolume M3 = Surface M2 x Profondeur\nPerimetre M = Longeur x 2 + Largeur x 2\nPerimetre Base M = (Longeur + 1) x 2 + (Largeur+1) x 2\nSurface Base M2 = Longeur + 1 x Largeur + 1\nEpaisseur Base M = 0.25\nVolume Base M3 = Epaisseur Base M x Surface Base M2\nNombre de Blocs BAB = (Perimetre M / .4) x (Profondeur / .2)\nSurface Interieur M2 = Perimetre M x Profondeur + Surface M\n\nIl faut un modele de calcul parametrable dans lequel on va pouvoir parametrer les formules avec les variables par categorie, sous-categorie et ligne.\n\nBase de prix : (On doit pouvoir modifier les prix, les unités et associer a un fournisseur par default (Base existante). Ce sera utile dans le futur quand nous developperont les liste d\'achat de materiaux)\nMain d\'oeuvre (1 pour) : 2500 Rs (NO VAT)\nTransport Matériaux (Unité) : 4500 Rs (NO VAT)\nLocation JCB (1 jour) : 10000 Rs (NO VAT)\nLocation Dammeuse (1 jour) : 2500 Rs (NO VAT)\nCrusherrun (1 tonne) =  \nFer Y12 (barre de 9m) = \nFer Y10 (barre de 9m) =\nFer Y8 (barre de 5.8m) =\nPlastique noir (unité) = \nBois de coffrage (Planche de 2.4m x 15cm) = \nClous (forfait) = \nFer d\'attache (forfait) = \nMacadam ⅜ (tonne) = \nCiment (sac de 25kg) = \nRocksand .4 (tonne) = \nRocksand .2 (tonne) = \nColle Ciment (sac)\nLatex (Bouteille de 5 Lts) =\nTAL Sureproof (m2) =\nPekay Noir (m2) = \nBéton Toupie (m3) = \nEau Béton (Forfait) =\nSkimmer (unite) = \nTraversé de Parois (unite) =  \nTuyaux 50mm Haute Pression (Unite) =\nColle PVC (Forfait) =\nCables électriques 2.5mm2 3 cors (metre) = \nBoite de connexion electrique (unite) =\nSpot Led (unite) = \nPour les prix manquant, fais une recherche sur le web pour les prix à l\'Ile Maurice et mettre une valeur temporaire que je changerai apres via l\'interface de parametrage.\nNous devons pouvoir rajouter des lignes dans les prix de base\n\nPour le modele de calcul, voici les lignes par default pour le BOQ Piscine:\n1/ Préparation du terrain \n1A/ Fouille \n  - Location de JCB : 1 day\n  - Main d\'oeuvre : 0.125 jour d\'homme (manday) par \"surface m2\"\n  - Transport de matériaux : 2 x transports par 15 M2 de Surface\n  - transport pour Evacuation de la terre : 3 x transports par 15 M2 de Surface\n1B/ Site Railing \n  - Main d\'Oeuvre : 0.25 jour d\'homme (manday) par \"surface m2\"\n  - Bois : Round Up ((Perimetre M + 4) / 2.4)\n  - Clous (Forfait): 1\n  - Nylon (Forfait) : 1\n\n2/ La Base \n2A/ Compactage de la base\n  - Location dammeuse : 1 jour\n  - Main d\'oeuvre : 1 jour d\'homme par 15 M2 de \"Surface M2\"\n2B/ Radier\n  - Crusherrun (tonne) : Volume Base M3 x 1.6\n  - Fer Y12 pour base (barre) : (Largeur / .2 x (Longeur + 1))+(Longueur / .2 x (largeur+1)) x 2\n  - Fer Y12 pour amorce murs (barre) : (Perimetre M / .2) x (Profondeur + 1)\n  - Plastique noir (M2) : Surface M2\n  - Bois de coffrage (Planche) : Perimetre Base M / 2.4\n  - Clous (Forfait) : 1\n  - Fer d\'attache (Forfait) : 1\n  - Transport materiaux : 2 Camions / 15 M2 de Surface M2\n2C/ Coulage\n  - Main d\'oeuvre : 1 Jour de Main d\'Oeuvre\n  - Béton : Volume Base M3 x Béton Toupie (m3)\n  - Eau Béton : 1 x Eau Béton (Forfait)\n\n3/ Les Murs \n3A/ Montage\n  - Main d\'oeuvre (Jour) : Nombre de Blocs BAB / 75\n  - Fer Y12 pour barres Verticales (barre): Perimetre M / .2 x Profondeur\n  - Fer Y10 pour barres horizontales (barre) : Perimetre M x 2 / 9 \n  - Ciment (Sac de 25Kg) : Se baser sur le DTU francais pour la pose de parpaing sachant que la surface de parpaing est de (Longeur x Profondeur x 2) + (Largeur x Profondeur x 2) et qu\'un parpaing mesure 0.4 de long x 0.2 de large x 0.2 de haut et qu\'il faut du mortier tout autour du parpaing. Il faut aussi calculer la perte.\n  - Rocksand .4 (tonne) : Se baser sur le DTU francais pour la pose de parpaing sachant que la surface de parpaing est de (Longeur x Profondeur x 2) + (Largeur x Profondeur x 2) et qu\'un parpaing mesure 0.4 de long x 0.2 de large x 0.2 de haut et qu\'il faut du mortier tout autour du parpaing. Il faut aussi calculer la perte.\n  - Transport matériaux : 1 Transport par 15 m2 de surface\n3B/ Coulage\n  - Macadam ⅜ (tonne) : Se baser sur le DTU francais pour le coulage de béton 350Kg / M3 sachant que le volume de remplissage des parpaings est de (Perimetre M x Profondeur x .15)  Il faut aussi calculer la perte.\n  - Ciment (Sac de 25 Kg) : Se baser sur le DTU francais pour le coulage de béton 350Kg / M3 sachant que le volume de remplissage des parpaings est de (Perimetre M x Profondeur x .15)  Il faut aussi calculer la perte. \n  - Rocksand .4 : Se baser sur le DTU francais pour le coulage de béton 350Kg / M3 sachant que le volume de remplissage des parpaings est de (Perimetre M x Profondeur x .15)  Il faut aussi calculer la perte. \n  - transport matériaux : 1 transport / 15 M2 de surface\n\n3C/ Crepissage Interieur \n  - Main d\'oeuvre (jour) : 1 / 35 M2 de Surface Interieure M2 \n  - Rocksand 0.2 (tonne) : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte. \n  - Colle Ciment (Sac de 15 Kg) : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte. \n  - Latex (Bouteille de 5 Lts) : 1 / 10M2 de  \"Surface Interieure M2\"\n  - Ciment : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte.\n  - Transport Materiaux : 1 transport / 15 M2 de surface\n\n3D/ Crepissage Exterieur \n- Main d\'oeuvre (jour) : 1 / 35 M2 de Surface Interieure M2 \n  - Rocksand 0.2 (tonne) : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte. \n  - Colle Ciment (Sac de 15 Kg) : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte. \n  - Latex (Bouteille de 5 Lts) : 1 / 10M2 de  \"Surface Interieure M2\"\n  - Ciment : Se baser sur le DTU francais pour le crepissage des murs en 1 couche sachant que la surface a crepir est \"Surface Interieure M2\". Il faut aussi calculer la perte.\n  - Transport Materiaux : 1 transport / 15 M2 de surface\n\n4/ Etancheite\n4A/ Etanchéité Interieure \n  - Main d\'oeuvre (jour) : 2 / 15 M2 de \"Surface Interieur M2\" \n  - TAL Sureproof (Kit) : 7 / 42 M2 de \"Surface Interieur M2\"\n  - Pinceau (Forfait) : 1\n\n4B/ Etanchéité Exterieure \n  - Main d\'oeuvre (jour) : 2 / 15 M2 de \"Surface Interieur M2\" \n  - Pekay Noir : 7 / 42 M2 de \"Surface Interieur M2\"\n  - Pinceau (Forfait) : 1\n\n5/ Plomberie & Electricité Structure \n5A/ Plomberie\n  - Plombier (jours) : 2 / 15 M2 de \"Surface M2\"\n  - Skimmer (unite) : 1 / 36 M3 (Arrondir a l\'unite au dessus) \n  - Traversé de parois (unite) :  2 / 36 M3 (Arrondir a l\'unite au dessus)\n  - Buses (unite) : 2 / 36 M3 (Arrondir a l\'unite au dessus)\n  - Tuyaux 50mm Haute Pression (Unite) : Perimetre x 2 / 5.8 (Arrondir a l\'unite au dessus)\n  - Colle PVC (Forfait) : 1, \n  - Transport materiaux : 1 \n5B/ Electricité\n  - Electricien : 2 / 15 M2 de \"Surface M2\" \n  - Tuyau spot led : Perimetre M / 5.8 (Arrondir a l\'unite au dessus)\n  - Cables électriques 2.5mm2 3 cors : Perimetre M\n  - Boite de connexion electrique (unite) : 1 / spot led \n  - transport materiaux : 1 \n\nPuis, les options (dans un BOQ sepraré suivant le meme principe):\nOPT1 Electrique\nOPT1A Eclairage\n  - Spot Led (unite)\nOPT1B Autres\n  - Pompe de Circulation\n  - Domotique\nOPT 2 Structure\nOPT2A Marches de 60cm de large\n  - Main d\'oeuvre (jour) : 2\n  - Bloc BAB (unite) : 20\n  - Ciment (sac de 25Kg) : 10\n  - Rocksand 0.2 (tonne) : 2 \n  - Macadam ⅜ (tonne) : 2\n  - Carrelage (M2) : (Dependant du finish choisi)\n  - Carreleur (M2) : (Dependant du finish choisi)\n  - Colle Carreau (Sac de 15 Kg) : 2\nOPT2A Banc (longeur ou largeur)\n  - Main d\'oeuvre (jour) : 5\n  - Bloc BAB (unite) : 30\n  - Ciment (sac de 25Kg) : 20\n  - Rocksand 0.2 (tonne) : 3 \n  - Macadam ⅜ (tonne) : 3\n  - Carrelage (M2) : (Dependant du finish choisi)\n  - Carreleur (M2) : (Dependant du finish choisi)\n  - Colle Carreau (Sac de 15 Kg) : 4\n  - Tiles Spacers (Forfait) : 1\n  - Joints (1 Kg) : 20 Kg / 35 M2 de \"Surface Interieur M2\"\nOPT3 Filtration\nOPT3A Filtration Basique\n  - Filtre à Sable (Unite) : 1 (Depend du volume de la piscine pour le modele)\n  - Pompe de Piscine (unite) : 1 (Depend du volume de la piscine pour le modele)\n  - Panneau Electrique (unite) : 1\n  - Electricien (jour) : 1\n  - Plombier (jour) : 1\nOPT3B Filtration Améliorée\n  - Salt chlorinateur (unite) :\nOPT 4 Finissions\nOPT4A Carrelage\n  - Carrelage (M2) : (Plusieurs Choix)\n  - Carreleur (M2) : (Dependant du finish choisi)\n  - Colle Carreau (Sac de 15 Kg) : 20 sacs / 35 M2 de \"Surface Interieur M2\"\n  - Tiles Spacers (Forfait) : 1\n  - Joints (1 Kg) : 20 Kg / 35 M2 de \"Surface Interieur M2\"\n\nRajoute les elements manquants dans la liste de prix si besoin\n\nJe dois pouvoir creer plusieurs Modeles de Piscine avec chacun son BOQ.', 'completee', 'urgent', 'important', 6, '2026-02-08 07:25:18', '2026-02-17 16:59:53'),
(7, 'Gallerie Photos Projets Complétés', 'Je souhaiterai pouvoir afficher une gallerie photo au public.\nUtiliser la section photo actuelle et rajouter le image type \"gallerie\" pour cela.\nIl faut que les photos soient filtrable par region (Nord, Sud, Est Ouest et Centre)', 'non_demarree', 'non_urgent', 'important', 7, '2026-02-08 07:33:15', '2026-03-02 14:18:31'),
(8, 'Systeme de Commissions pour les vendeurs avec gestion des paiements recus', 'Les vendeurs (Gestion des utilisateurs) doivent recevoir des commissions sur leur vente complétées.\nLa vente doit etre confirmé, une pro-invoice emise et nous devons avoir recu un paiement. la commission doit etre calculé en prorata du paiement recu. Si une commande est annulé apres avoir recu un paiement, la commission devra etre retourné et deduite des prochaines commissions a recevoir.\nles commissions doivent etre gere depuis l\'interface utilisateur.\nTous les types d\'utilisateur peuvent percevoir des commissions a l\'exception des fournisseurs ou des professionnels.', 'non_demarree', 'non_urgent', 'important', 8, '2026-02-08 07:34:07', '2026-02-10 04:53:25'),
(9, 'Tester les templates d\'email', 'On doit pouvoir tester les templates d\'email', 'non_demarree', 'non_urgent', 'non_important', 9, '2026-02-08 07:46:59', '2026-02-08 07:46:59'),
(10, 'Email non envoyé apres qu\'un devis soit mis a jour.', 'Quand je change le status d\'un devis, le status est correctement changé mais le email de notification n\'est pas envoyé.\nil faut s\'arrurer que toutes les notifications fonctionnent correctement, les envois de devis a la creation, modification et annulation, ...\n', 'completee', 'urgent', 'important', 10, '2026-02-08 07:52:03', '2026-02-08 09:15:02'),
(11, 'Modifier Headeur Banner', 'Modifier le Header banner\nmettre la photo sans darker shade et bouger le title a droite avec un background shaded sur un quart de la largeur', 'non_demarree', 'non_urgent', 'non_important', 11, '2026-02-08 08:44:50', '2026-02-08 08:44:50'),
(12, 'Bug dans la gestion des modeles dans l\'admin', 'Page : Gestion des modèles depuis l\'admin\nSituation : Il y a 3 boutons dans le bloc du modèle (Petite roue, Edit, Delete)\nBug 1: Quand je clique sur la petite roue, le site est redirigé vers l\'interface public sur la page d\'accueil. je crois que ce bouton peut etre supprimé. Edit marche correctement lui. Donc on garde Edit\nBug 2 : Quand je clique sur effacer, j\'ai un message d\'erreur \"invalid action\"\nAmelioration : Rajouter un bouton \"BOQ\" qui redirige vers le BOQ du modele.', 'completee', 'urgent', 'important', 12, '2026-02-10 04:45:13', '2026-02-16 05:15:41'),
(13, 'Systeme de Remises', 'Je dois pouvoir appliquer des remises individuelles ou globales pour les modeles de conteneur et/ou de piscine entre 2 dates.\nIl faut que je puisse creer une remises en editant un modele deopuis l\'admin\nOu depuis une page dediée \"Remises\" sous parametres\nDans cette page on doit pouvoir creer une remise et l\'associer à un ou plusieurs modeles entre 2 dates.\nLa remise doit s\'appliquer soit au prix de base HT ou le prix des options ht ou les 2 HT', 'completee', 'non_urgent', 'important', 13, '2026-02-10 05:54:37', '2026-02-25 18:10:22'),
(14, 'Desactiver Admin pass', 'Je voudrait une option dans les parametres du site pour desactiver l\'utilisation du password quand on ouvre l\'admin.\nComme cela lors du developpement copilot pourra ouvrir les pages admin et verifier que tout marche bien.', 'completee', 'urgent', 'important', 14, '2026-02-12 04:56:22', '2026-02-12 12:51:31'),
(15, 'Devis cliquable depuis le dahsboard (Modifications)', 'Dashboard Admin\nQuand on clique sur la ref d\'un devis, sa page detail doit s\'ouvrir', 'completee', 'urgent', 'important', 15, '2026-02-12 12:51:22', '2026-02-16 05:59:13'),
(16, 'Enlver le formulaire de log In pour l\'administrateur en mod de dev', 'En mode DEVELOPEMENT, le mot de passe admin a ete desactivé, cependant, le formulaire de log in est toujours present donc CoPilot n\'arrive pas a bien tester ses changements.\nIl faut carrement supprimer le formulaire de log IN quand le mode developpement est activé.', 'completee', 'urgent', 'important', 16, '2026-02-16 09:49:55', '2026-02-17 17:10:42'),
(17, 'Photo et Plan ne marche plus pour les modeles', 'Photo et Plan ne marche plus pour les modeles dans la gallerie photo', 'completee', 'urgent', 'important', 17, '2026-02-17 05:27:17', '2026-02-17 17:38:05'),
(18, 'Tableau de Rapports', 'Interface de gestion de Rapports\nA/ Vente (Devis) : Par devis, par client, par status, par mois, par années, custom dates, par modele\nB/ Achat (BOQ) : Par Fournisseur, par periode, par status, par modele, par devis\nC/ Clients : Nb de Devis, par periode, par status, par modele\nD/ Exportation par XLS et PDF', 'non_demarree', 'non_urgent', 'important', 18, '2026-02-17 13:34:04', '2026-02-17 13:34:04'),
(19, 'Devis en PDF', 'Je veux que le site envois un PDF devis lorsqu\'un admin approve un devis qu\'un client a crée. et qu\'un email soit envoyer aux admin quand un client creer un devis depuis la page publique.\nLe look du PDF doit etre modifiable :\nIl faut une page PDF Templates dans l\'admin. Dans cette page on doit pouvoir creer des template pour document PDF comme les Devis, les Rapports (a venir), les factures (a venir) ...\nQuand on creer un nouveau template, on l\'associe a un devis ou un rapport ou une facture ..., on met un nom et une description, une fois crée, le site affiche un A4 coupé en rectangles (20 lignes et 10 colonnes). On doit pouvoir merge ces colonnes et y inserer des variables qui permettent d\'afficher les variables du site dans ces cellules. Quand on clique sur une cellule, un modal s\'ouvre et propose des variables ou bien on ecrit un texte libre. on peut mettre en gras, souligner, mettre en italique et changer la taille de la police et changer la police. On doit aussi pouvoir afficher des images dans ces blocs (de la photo gallerie ou le logo.\nLes variables doivent permettre d\'afficher toutes les infos disponibles sur les different type de doc ( Ref, nom, description, prix, options, modalités de paiement (reglable dans la page Site de l\'admin), Le nu de compte en banque (reglable dans la page site de l\'admin), le Nu de tel, l\'email, etc ...\non doit aussi pouvoir changer la hauteur des lignes et la largeur des colonnes)', 'completee', 'urgent', 'important', 19, '2026-02-17 18:08:38', '2026-02-25 15:52:56'),
(20, 'Themes et designs', 'Je veux que des themes et designs soit assignéa des utilisateurs pro\nL\'admin de Sunbox selectionne un Theme pour un utilisateur pro\nIl peut aussi changer celui de sunbox si il le souhaite.\nLes themes doivent proposer de pouvoir deplacer le logo (gauche centre droite)\nChanger la taille du header photo\nChanger la police et les couleurs\nDeplacer le menu (gauche centre droite) avec ou sans backgound\nChanger la couleur des boutons', 'non_demarree', 'urgent', 'important', 20, '2026-03-02 04:52:59', '2026-03-02 14:17:57'),
(21, 'Changer Valeurs des Devis, modeles etc ...', 'l\'admin de sunbox doit pouvoir changer les valeurs pour la creation des devis, des modeles ...\nEt aussi le montant credité pour l\'utilisateur pro\nL\'admin de sunbox doit aussi pouvoir dispencer un utilisateur des credits ... c\'est a dire que cet utilisateur pourra utiliser le site comme bon lui semble sans la fonctionnalité Credits', 'non_demarree', 'urgent', 'important', 21, '2026-03-02 05:06:29', '2026-03-02 14:18:21'),
(22, 'Modifier Ligne fournisseur directement dans la ligne du BOQ', 'Modifier Ligne fournisseur directement dans la ligne du BOQ', 'non_demarree', 'urgent', 'important', 22, '2026-03-02 14:24:58', '2026-03-02 14:24:58');

-- --------------------------------------------------------

--
-- Table structure for table `discounts`
--

CREATE TABLE `discounts` (
  `id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discount_type` enum('percentage','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percentage' COMMENT 'percentage = % off, fixed = fixed amount off',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Percentage (e.g. 10 for 10%) or fixed amount in Rs',
  `apply_to` enum('base_price','options','both') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'both' COMMENT 'Apply to base price HT, options HT, or both',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `discounts`
--

INSERT INTO `discounts` (`id`, `name`, `description`, `discount_type`, `discount_value`, `apply_to`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Journée Mondiale de l\'Habitat', '', 'percentage', 5.00, 'both', '2026-02-25', '2026-03-08', 1, '2026-02-25 16:32:50', '2026-03-02 14:03:31');

-- --------------------------------------------------------

--
-- Table structure for table `discount_models`
--

CREATE TABLE `discount_models` (
  `id` int NOT NULL,
  `discount_id` int NOT NULL,
  `model_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `discount_models`
--

INSERT INTO `discount_models` (`id`, `discount_id`, `model_id`) VALUES
(22, 1, 18),
(21, 1, 20);

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int NOT NULL,
  `recipient_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_logs`
--

INSERT INTO `email_logs` (`id`, `recipient_email`, `recipient_name`, `subject`, `template_key`, `status`, `error_message`, `sent_at`, `created_at`) VALUES
(1, 'vmamet@icloud.com', NULL, 'Votre devis WCQ-202602-000005 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-08 09:14:10', '2026-02-08 09:14:10'),
(2, 'vmamet@icloud.com', NULL, 'Votre devis WCQ-202602-000005 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-08 09:53:51', '2026-02-08 09:53:51'),
(3, 'vmamet@icloud.com', NULL, 'Votre devis WFQ-202602-000006 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-08 10:10:15', '2026-02-08 10:10:15'),
(4, 'vmamet@icloud.com', NULL, 'Votre devis WFQ-202602-000007 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-08 10:49:51', '2026-02-08 10:49:51'),
(5, 'casnouce@hotmail.com', NULL, 'Votre devis WCQ-202602-000008 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-12 14:46:52', '2026-02-12 14:46:52'),
(6, 'casnouce@hotmail.com', NULL, 'Votre devis WFQ-202602-000009 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-14 03:53:53', '2026-02-14 03:53:53'),
(7, 'casnouce@hotmail.com', NULL, 'Votre devis WCQ-202602-000010 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-15 04:30:45', '2026-02-15 04:30:45'),
(8, 'albertmamet47@gmail.com', NULL, 'Votre devis WCQ-202602-000012 a été approuvé', 'quote_approved', 'sent', NULL, '2026-02-17 12:45:01', '2026-02-17 12:45:01'),
(9, 'vmamet@icloud.com', NULL, 'Votre devis WPQ-202602-000013 a été approuvé', 'quote_approved_pdf', 'sent', NULL, '2026-02-17 19:40:50', '2026-02-17 19:40:50'),
(10, 'vmamet@icloud.com', NULL, 'Votre devis WCQ-202602-000005 – Devis', 'quote_pdf', 'sent', NULL, '2026-02-21 21:32:16', '2026-02-21 21:32:16'),
(11, 'vmamet@icloud.com', NULL, 'Votre devis WCQ-202602-000005 – Devis', 'quote_pdf', 'sent', NULL, '2026-02-21 21:43:59', '2026-02-21 21:43:59'),
(12, 'mrbcreative0987@gmail.com', NULL, 'Votre devis WPQ-202602-000014 – Devis', 'quote_pdf', 'sent', NULL, '2026-02-23 05:38:00', '2026-02-23 05:38:00'),
(13, 'sanjiv.luckhea13@gmail.com', NULL, 'Votre devis WCQ-202603-000017 a été approuvé', 'quote_approved', 'sent', NULL, '2026-03-01 16:07:39', '2026-03-01 16:07:39');

-- --------------------------------------------------------

--
-- Table structure for table `email_signatures`
--

CREATE TABLE `email_signatures` (
  `id` int NOT NULL,
  `signature_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `body_html` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_signatures`
--

INSERT INTO `email_signatures` (`id`, `signature_key`, `name`, `description`, `body_html`, `logo_url`, `photo_url`, `is_active`, `is_default`, `created_at`, `updated_at`) VALUES
(1, 'default_signature', 'Signature par défaut', 'Signature standard de l\'entreprise', '<p><span style=\"color: rgb(51, 51, 51);\">{{signature_photo}}</span></p><p><strong style=\"color: rgb(31, 41, 55);\">{{sender_name}}</strong></p><p><span style=\"color: rgb(107, 114, 128);\">{{sender_title}}</span></p><p><span style=\"color: rgb(51, 51, 51);\">{{signature_logo}}</span></p><p><strong style=\"color: rgb(249, 115, 22);\">Sunbox Mauritius</strong></p><p><span style=\"color: rgb(51, 51, 51);\">📍 Grand Baie, Mauritius</span></p><p><span style=\"color: rgb(51, 51, 51);\">📞 +230 52544544 / +230 54221025</span></p><p><span style=\"color: rgb(51, 51, 51);\">✉️ info@sunbox-mauritius.com</span></p><p><span style=\"color: rgb(51, 51, 51);\">🌐 www.sunbox-mauritius.com</span></p>', '', '/uploads/id-photos/photo_69882b95b6343_1770531733.jpg', 1, 1, '2026-02-08 05:40:59', '2026-02-08 06:22:19');

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int NOT NULL,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_type` enum('quote','notification','password_reset','contact','status_change','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_html` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `body_text` text COLLATE utf8mb4_unicode_ci,
  `variables` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_templates`
--

INSERT INTO `email_templates` (`id`, `template_key`, `template_type`, `name`, `description`, `subject`, `body_html`, `body_text`, `variables`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'quote_confirmation', 'quote', 'Confirmation de devis', 'Email envoyé au client après création d\'un devis', 'Votre devis Sunbox Mauritius - {{reference}}', '<html>\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n<div style=\"background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;\">\n<h1 style=\"color: white; margin: 0;\">Sunbox Mauritius</h1>\n</div>\n<div style=\"padding: 30px; background: #f9fafb;\">\n<h2 style=\"color: #1f2937;\">Bonjour {{customer_name}},</h2>\n<p>Merci pour votre demande de devis. Voici le récapitulatif :</p>\n<div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0;\">\n<p><strong>Référence :</strong> {{reference}}</p>\n<p><strong>Modèle :</strong> {{model_name}}</p>\n<p><strong>Prix de base :</strong> Rs {{base_price}}</p>\n<p><strong>Options :</strong> Rs {{options_total}}</p>\n<hr style=\"border: none; border-top: 2px solid #f97316; margin: 15px 0;\">\n<p style=\"font-size: 18px;\"><strong>Total :</strong> Rs {{total_price}}</p>\n</div>\n<p>Ce devis est valable jusqu\'au {{valid_until}}.</p>\n<p>Notre équipe vous contactera dans les plus brefs délais.</p>\n<p style=\"margin-top: 30px;\">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>\n</div>\n<div style=\"background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;\">\n<p>Sunbox Mauritius - Grand Baie, Mauritius</p>\n<p>Tel: +230 5254 4544 | Email: vmamet@sunbox-mauritius.com</p>\n</div>\n</body>\n</html>', 'Bonjour {{customer_name}},\n\nMerci pour votre demande de devis.\n\nRéférence: {{reference}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nCe devis est valable jusqu\'au {{valid_until}}.\n\nCordialement,\nL\'équipe Sunbox Mauritius', '[\"customer_name\", \"reference\", \"model_name\", \"base_price\", \"options_total\", \"total_price\", \"valid_until\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:22:43'),
(2, 'quote_admin_notification', 'notification', 'Notification admin nouveau devis', 'Email envoyé à l\'admin lors d\'un nouveau devis', 'Nouveau devis reçu - {{reference}}', '<html>\r\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n<div style=\"background: #1f2937; padding: 20px; text-align: center;\">\r\n<h1 style=\"color: #f97316; margin: 0;\">Nouveau Devis</h1>\r\n</div>\r\n<div style=\"padding: 30px; background: #f9fafb;\">\r\n<h2 style=\"color: #1f2937;\">Référence: {{reference}}</h2>\r\n<div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0;\">\r\n<h3>Client</h3>\r\n<p><strong>Nom :</strong> {{customer_name}}</p>\r\n<p><strong>Email :</strong> {{customer_email}}</p>\r\n<p><strong>Téléphone :</strong> {{customer_phone}}</p>\r\n<p><strong>Adresse :</strong> {{customer_address}}</p>\r\n<h3>Devis</h3>\r\n<p><strong>Modèle :</strong> {{model_name}} ({{model_type}})</p>\r\n<p><strong>Prix de base :</strong> Rs {{base_price}}</p>\r\n<p><strong>Options :</strong> Rs {{options_total}}</p>\r\n<p style=\"font-size: 18px; color: #f97316;\"><strong>Total : Rs {{total_price}}</strong></p>\r\n</div>\r\n<p><strong>Message du client :</strong></p>\r\n<p style=\"background: white; padding: 15px; border-radius: 8px;\">{{customer_message}}</p>\r\n<p style=\"margin-top: 20px;\">\r\n<a href=\"{{admin_url}}\" style=\"background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;\">Voir dans l\'admin</a>\r\n</p>\r\n</div>\r\n</body>\r\n</html>', 'Nouveau devis reçu\n\nRéférence: {{reference}}\nClient: {{customer_name}}\nEmail: {{customer_email}}\nTéléphone: {{customer_phone}}\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nMessage: {{customer_message}}', '[\"reference\", \"customer_name\", \"customer_email\", \"customer_phone\", \"customer_address\", \"model_name\", \"model_type\", \"base_price\", \"options_total\", \"total_price\", \"customer_message\", \"admin_url\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:20:30'),
(3, 'quote_approved', 'status_change', 'Devis approuvé', 'Email envoyé au client lorsque son devis est approuvé', 'Votre devis {{reference}} a été approuvé', '<html>\r\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n<div style=\"background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;\">\r\n<h1 style=\"color: white; margin: 0;\">Devis Approuvé</h1>\r\n</div>\r\n<div style=\"padding: 30px; background: #f9fafb;\">\r\n<h2 style=\"color: #1f2937;\">Bonjour {{customer_name}},</h2>\r\n<p>Excellente nouvelle ! Votre devis <strong>{{reference}}</strong> a été approuvé.</p>\r\n<div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0;\">\r\n<p><strong>Modèle :</strong> {{model_name}}</p>\r\n<p style=\"font-size: 20px; color: #22c55e;\"><strong>Total : Rs {{total_price}}</strong></p>\r\n</div>\r\n<p>Notre équipe commerciale vous contactera très prochainement pour finaliser votre commande.</p>\r\n<p style=\"margin-top: 30px;\">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>\r\n</div>\r\n</body>\r\n</html>', 'Bonjour {{customer_name}},\n\nVotre devis {{reference}} a été approuvé.\nModèle: {{model_name}}\nTotal: Rs {{total_price}}\n\nNotre équipe vous contactera prochainement.\n\nCordialement,\nL\'équipe Sunbox Mauritius', '[\"customer_name\", \"reference\", \"model_name\", \"total_price\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:20:30'),
(4, 'quote_rejected', 'status_change', 'Devis refusé', 'Email envoyé au client lorsque son devis est refusé', 'Concernant votre devis {{reference}}', '<html>\r\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n<div style=\"background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;\">\r\n<h1 style=\"color: white; margin: 0;\">Information Devis</h1>\r\n</div>\r\n<div style=\"padding: 30px; background: #f9fafb;\">\r\n<h2 style=\"color: #1f2937;\">Bonjour {{customer_name}},</h2>\r\n<p>Nous vous informons que votre devis <strong>{{reference}}</strong> n\'a malheureusement pas pu être validé.</p>\r\n<div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0;\">\r\n<p><strong>Modèle :</strong> {{model_name}}</p>\r\n<p><strong>Raison :</strong> {{rejection_reason}}</p>\r\n</div>\r\n<p>N\'hésitez pas à nous contacter pour plus d\'informations ou pour discuter d\'autres options.</p>\r\n<p style=\"margin-top: 30px;\">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>\r\n</div>\r\n</body>\r\n</html>', 'Bonjour {{customer_name}},\n\nVotre devis {{reference}} n\'a pas pu être validé.\nModèle: {{model_name}}\nRaison: {{rejection_reason}}\n\nN\'hésitez pas à nous contacter.\n\nCordialement,\nL\'équipe Sunbox Mauritius', '[\"customer_name\", \"reference\", \"model_name\", \"rejection_reason\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:20:30'),
(5, 'contact_confirmation', 'contact', 'Confirmation de contact', 'Email envoyé après soumission du formulaire de contact', 'Nous avons bien reçu votre message', '<html>\r\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n<div style=\"background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;\">\r\n<h1 style=\"color: white; margin: 0;\">Sunbox Mauritius</h1>\r\n</div>\r\n<div style=\"padding: 30px; background: #f9fafb;\">\r\n<h2 style=\"color: #1f2937;\">Bonjour {{name}},</h2>\r\n<p>Nous avons bien reçu votre message et nous vous en remercions.</p>\r\n<p>Notre équipe vous répondra dans les plus brefs délais.</p>\r\n<div style=\"background: white; padding: 20px; border-radius: 8px; margin: 20px 0;\">\r\n<p><strong>Votre message :</strong></p>\r\n<p style=\"color: #6b7280;\">{{message}}</p>\r\n</div>\r\n<p style=\"margin-top: 30px;\">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>\r\n</div>\r\n</body>\r\n</html>', 'Bonjour {{name}},\n\nNous avons bien reçu votre message et nous vous en remercions.\n\nCordialement,\nL\'équipe Sunbox Mauritius', '[\"name\", \"message\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:20:30'),
(6, 'password_reset', 'password_reset', 'Réinitialisation de mot de passe', 'Email envoyé pour réinitialiser le mot de passe', 'Réinitialisation de votre mot de passe - Sunbox Mauritius', '<html>\r\n<body style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n<div style=\"background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;\">\r\n<h1 style=\"color: white; margin: 0;\">Sunbox Mauritius</h1>\r\n</div>\r\n<div style=\"padding: 30px; background: #f9fafb;\">\r\n<h2 style=\"color: #1f2937;\">Bonjour {{name}},</h2>\r\n<p>Vous avez demandé à réinitialiser votre mot de passe.</p>\r\n<p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>\r\n<div style=\"text-align: center; margin: 30px 0;\">\r\n<a href=\"{{reset_link}}\" style=\"background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;\">Réinitialiser mon mot de passe</a>\r\n</div>\r\n<p style=\"color: #6b7280; font-size: 14px;\">Ce lien est valable pendant 1 heure.</p>\r\n<p style=\"color: #6b7280; font-size: 14px;\">Si vous n\'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>\r\n<p style=\"margin-top: 30px;\">Cordialement,<br><strong>L\'équipe Sunbox Mauritius</strong></p>\r\n</div>\r\n</body>\r\n</html>', 'Bonjour {{name}},\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nCliquez sur ce lien pour créer un nouveau mot de passe : {{reset_link}}\n\nCe lien est valable pendant 1 heure.\n\nSi vous n\'avez pas demandé cette réinitialisation, ignorez simplement cet email.\n\nCordialement,\nL\'équipe Sunbox Mauritius', '[\"name\", \"reset_link\"]', 1, '2026-02-08 05:20:30', '2026-02-08 05:20:30'),
(7, 'welcome_email', 'other', '', NULL, 'Bienvenue chez Sunbox', 'Je test\n{{customer_email}}\n{{reference}}', 'je test', NULL, 1, '2026-02-08 05:20:49', '2026-02-08 05:20:49');

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
  `unforeseen_cost_percent` decimal(5,2) NOT NULL DEFAULT '10.00' COMMENT 'Unforeseen cost percentage applied to base HT price',
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

INSERT INTO `models` (`id`, `name`, `type`, `description`, `base_price`, `unforeseen_cost_percent`, `surface_m2`, `bedrooms`, `bathrooms`, `image_url`, `plan_image_url`, `features`, `is_active`, `display_order`, `created_at`, `updated_at`, `container_20ft_count`, `container_40ft_count`, `pool_shape`, `has_overflow`) VALUES
(12, 'Studio 1X20-1B', 'container', '15m2 - 1 Chambre - 1 Cuisine - 1 x Conteneur de 20\'', 850000.00, 5.00, 15, 1, 1, '/uploads/models/fe09c14c95847e6aa2fa8af50d767961.jpg', NULL, '[\"ligne 1\", \"ligne 2\", \"ligne 3\"]', 1, 0, '2025-12-24 03:54:11', '2026-02-23 14:18:41', 1, 0, NULL, 0),
(14, 'Piscine Rectangulaire', 'pool', 'Piscine Rectangulaire', 0.00, 10.00, 0, 0, 0, '/uploads/models/4afc838afbbbb741116e99adeacfa9af.jpg', '', '[]', 1, 0, '2026-02-16 11:17:30', '2026-02-21 04:38:04', 0, 0, 'Rectangulaire', 0),
(15, 'Piscine en \"L\"', 'pool', 'Piscine en L', 0.00, 10.00, 0, 0, 0, '/uploads/models/7105b7a9f6a464b67b6b4d74a846cfe3.jpg', '', '[]', 1, 0, '2026-02-21 11:30:43', '2026-02-21 18:19:44', 0, 0, 'L', 0),
(18, 'Piscine en T', 'pool', 'Piscine en T', 0.00, 10.00, 0, 0, 0, '/uploads/models/eabbb3e324adaba0a85e548a1808095d.jpg', '', '[]', 1, 0, '2026-02-23 05:04:58', '2026-02-23 15:05:59', 0, 0, 'T', 0),
(19, 'Maison Conteneur - 2X20-1B', 'container', 'Maison construite avec 2 conteneurs de 6m reconditionnés. Elle est équippée d\'1 chambre à coucher, une cuisine, une salle a manger/salon, une salle de bain attenante à la chambre et un toit d\'une pente (version de base).', 0.00, 10.00, 30, 1, 1, '/uploads/models/2a3314861c062aa4bc45be31021d10fe.jpg', '', '[]', 1, 0, '2026-02-23 14:18:02', '2026-02-23 14:58:29', 2, 0, 'Rectangulaire', 0),
(20, 'Maison Conteneur en C - 3X20-3B', 'container', 'Jolie maison en C avec 3 conteneurs', 0.00, 5.00, 45, 3, 3, '/uploads/models/64a98fbf86c62339e2ebe71c9f052bc7.jpg', '', '[]', 1, 0, '2026-02-24 14:29:25', '2026-03-01 14:50:44', 3, 0, 'Rectangulaire', 0),
(21, 'Sanjiv (Extension avec 2 conteneurs)', 'container', '', 0.00, 5.00, 0, 0, 0, '/uploads/models/ceb88080ba76a2c4b819ef1f78cb8e86.jpg', '', '[]', 0, 0, '2026-03-01 15:01:13', '2026-03-01 18:14:20', 0, 0, 'Rectangulaire', 0);

-- --------------------------------------------------------

--
-- Table structure for table `model_images`
--

CREATE TABLE `model_images` (
  `id` int NOT NULL,
  `model_id` int NOT NULL,
  `media_type` enum('photo','plan','bandeau','category_image') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'photo',
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
(16, 0, '', 'uploads/models/589f4e8153eb6148cb5da7615282ebf2.jpg', 0, 0, '2026-02-07 05:24:59'),
(17, 0, '', 'uploads/models/4234582edd92337ecf5f1a0140036b6e.jpg', 0, 0, '2026-02-07 12:16:51'),
(18, 0, 'category_image', 'uploads/models/706ec6a8392d0998d53893b4c944639f.jpg', 0, 0, '2026-02-07 12:25:36'),
(19, 0, 'category_image', 'uploads/models/5d45db8e21cc34b80ad23bc7b9c2c5fa.jpg', 0, 0, '2026-02-07 13:35:23'),
(21, 0, 'category_image', 'uploads/models/98d1a9ae889a007307286bf7711d265f.jpg', 0, 0, '2026-02-07 13:39:51'),
(22, 0, 'category_image', 'uploads/models/daef2c3bf84375d1ab4cc1ddc69c4306.jpg', 0, 0, '2026-02-07 13:42:57'),
(23, 0, 'category_image', 'uploads/models/b2231366e8b606ff3a636a0cfb39e3de.jpg', 0, 0, '2026-02-07 13:48:10'),
(24, 0, 'category_image', 'uploads/models/ac8ae4c6c8357e84ef53567e3807a1c2.jpg', 0, 0, '2026-02-07 14:05:49'),
(25, 0, 'category_image', 'uploads/models/27b5f8d650557c02f7a1d934d98734ec.jpg', 0, 0, '2026-02-07 16:15:21'),
(26, 0, 'category_image', 'uploads/models/cba5bb963c044a8c01e592e5bc716bbf.jpg', 0, 0, '2026-02-07 16:20:33'),
(27, 0, 'category_image', 'uploads/models/ad1c7a5b8e7fc671a9754e819d5673f0.jpg', 0, 0, '2026-02-07 16:24:34'),
(29, 14, 'plan', 'uploads/models/8a5bcab38cba3afc4125ac958e099839.jpg', 0, 0, '2026-02-17 17:36:06'),
(31, 14, 'photo', 'uploads/models/4afc838afbbbb741116e99adeacfa9af.jpg', 1, 0, '2026-02-21 04:37:59'),
(32, 15, 'photo', 'uploads/models/7105b7a9f6a464b67b6b4d74a846cfe3.jpg', 1, 0, '2026-02-21 11:33:53'),
(33, 15, 'plan', 'uploads/models/5970c4bfe28f95798ea4d7415673a092.jpg', 0, 0, '2026-02-21 11:38:00'),
(36, 19, 'photo', 'uploads/models/2a3314861c062aa4bc45be31021d10fe.jpg', 1, 0, '2026-02-23 14:22:00'),
(37, 19, 'plan', 'uploads/models/8494005485b119cd0607976d8b61278b.jpg', 0, 0, '2026-02-23 14:29:02'),
(38, 18, 'photo', 'uploads/models/eabbb3e324adaba0a85e548a1808095d.jpg', 1, 0, '2026-02-23 15:05:59'),
(39, 18, 'plan', 'uploads/models/c9348beaaee514dd5e5a3b6d2fb2ab71.jpg', 0, 0, '2026-02-23 15:06:17'),
(42, 20, 'photo', 'uploads/models/64a98fbf86c62339e2ebe71c9f052bc7.jpg', 1, 0, '2026-02-24 16:18:57'),
(43, 20, 'plan', 'uploads/models/7f75d30f7b581917b70ab543aa322e82.jpg', 0, 0, '2026-02-24 16:19:13'),
(44, 21, 'photo', 'uploads/models/ceb88080ba76a2c4b819ef1f78cb8e86.jpg', 1, 0, '2026-03-01 15:28:28'),
(45, 21, 'plan', 'uploads/models/c801c9870031c15d031ba35a1b68f80c.jpg', 0, 0, '2026-03-01 15:28:52');

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
-- Table structure for table `pdf_templates`
--

CREATE TABLE `pdf_templates` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `document_type` enum('devis','rapport','facture') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'devis',
  `grid_data` json NOT NULL COMMENT 'Cell layout: merged cells, content, variables, formatting',
  `row_count` int NOT NULL DEFAULT '20',
  `col_count` int NOT NULL DEFAULT '10',
  `row_heights` json DEFAULT NULL COMMENT 'Array of row heights in mm',
  `col_widths` json DEFAULT NULL COMMENT 'Array of column widths in mm',
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pdf_templates`
--

INSERT INTO `pdf_templates` (`id`, `name`, `description`, `document_type`, `grid_data`, `row_count`, `col_count`, `row_heights`, `col_widths`, `is_default`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Devis Standard', 'Devis Standard', 'devis', '{\"0-0\": {\"bold\": false, \"type\": \"image\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"\", \"rowspan\": 2, \"fontSize\": 10, \"imageUrl\": \"{{logo}}\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"0-3\": {\"bold\": true, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 4, \"content\": \"DEVIS\", \"rowspan\": 2, \"fontSize\": 14, \"imageUrl\": \"\", \"textAlign\": \"center\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"0-7\": {\"bold\": true, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"Réf : {{reference}}\", \"rowspan\": 1, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"right\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"1-7\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"Date: {{created_at}}\", \"rowspan\": 1, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"right\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"2-0\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"#000000\", \"colspan\": 10, \"content\": \"\", \"rowspan\": 1, \"fontSize\": 6, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"3-0\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"Client: {{customer_name}}\", \"rowspan\": 1, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"3-4\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 6, \"content\": \"{{model_type}} : {{model_name}}\", \"rowspan\": 1, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"4-0\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"#000000\", \"colspan\": 10, \"content\": \"\", \"rowspan\": 1, \"fontSize\": 6, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"5-0\": {\"bold\": false, \"type\": \"image\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"{{model_image}}\", \"rowspan\": 3, \"fontSize\": 10, \"imageUrl\": \"{{model_image}}\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"5-3\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 7, \"content\": \"Description :\\n{{base_categories}}\", \"rowspan\": 6, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"8-0\": {\"bold\": false, \"type\": \"image\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"{{model_plan}}\", \"rowspan\": 3, \"fontSize\": 10, \"imageUrl\": \"{{model_plan}}\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"11-3\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 7, \"content\": \"Option(s) Choisie(s) : \\n{{option_categories}}\", \"rowspan\": 5, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"16-0\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"#000000\", \"colspan\": 10, \"content\": \"\", \"rowspan\": 1, \"fontSize\": 6, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"17-7\": {\"bold\": true, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"Total HT : {{total_ht}}\", \"rowspan\": 1, \"fontSize\": 8, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"18-7\": {\"bold\": false, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"TVA : {{tva}}\", \"rowspan\": 1, \"fontSize\": 8, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}, \"19-7\": {\"bold\": true, \"type\": \"text\", \"color\": \"\", \"italic\": false, \"merged\": true, \"bgColor\": \"\", \"colspan\": 3, \"content\": \"Total TTC : {{total_ttc}}\", \"rowspan\": 1, \"fontSize\": 10, \"imageUrl\": \"\", \"textAlign\": \"left\", \"underline\": false, \"fontFamily\": \"Arial\"}}', 20, 10, '[14, 14, 1, 14, 1, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 1, 14, 14, 14]', '[19, 19, 19, 19, 19, 19, 19, 19, 19, 19]', 0, 1, '2026-02-17 18:38:17', '2026-02-21 04:26:57');

-- --------------------------------------------------------

--
-- Table structure for table `pool_boq_price_list`
--

CREATE TABLE `pool_boq_price_list` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unité',
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `has_vat` tinyint(1) DEFAULT '1',
  `supplier_id` int DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pool_boq_price_list`
--

INSERT INTO `pool_boq_price_list` (`id`, `name`, `unit`, `unit_price`, `has_vat`, `supplier_id`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'Main d\'oeuvre (1 jour)', 'jour', 2500.00, 0, NULL, 1, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(2, 'Transport Matériaux', 'unité', 4500.00, 0, NULL, 2, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(3, 'Location JCB (1 jour)', 'jour', 10000.00, 0, NULL, 3, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(4, 'Location Dammeuse (1 jour)', 'jour', 2500.00, 0, NULL, 4, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(5, 'Crusherrun', 'tonne', 800.00, 1, NULL, 5, '2026-02-16 07:42:04', '2026-02-17 03:45:30'),
(6, 'Fer Y12 (barre de 9m)', 'barre', 450.00, 1, NULL, 6, '2026-02-16 07:42:04', '2026-02-17 03:42:43'),
(7, 'Fer Y10 (barre de 9m)', 'barre', 300.00, 1, NULL, 7, '2026-02-16 07:42:04', '2026-02-17 03:42:56'),
(8, 'Fer Y8 (barre de 5.8m)', 'barre', 200.00, 1, NULL, 8, '2026-02-16 07:42:04', '2026-02-17 03:43:10'),
(9, 'Plastique noir', 'unité', 500.00, 1, NULL, 9, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(10, 'Bois de coffrage (Planche de 2.4m x 15cm)', 'planche', 250.00, 1, NULL, 10, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(11, 'Clous (forfait)', 'forfait', 500.00, 1, NULL, 11, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(12, 'Fer d\'attache (forfait)', 'forfait', 300.00, 1, NULL, 12, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(13, 'Macadam 3/8 (tonne)', 'tonne', 1800.00, 1, NULL, 13, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(14, 'Ciment (sac de 25kg)', 'sac', 240.00, 1, NULL, 14, '2026-02-16 07:42:04', '2026-02-17 04:17:20'),
(15, 'Rocksand .4 (tonne)', 'tonne', 1100.00, 1, NULL, 15, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(16, 'Rocksand .2 (tonne)', 'tonne', 1200.00, 1, NULL, 16, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(17, 'Colle Ciment (sac de 15Kg)', 'sac', 350.00, 1, NULL, 17, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(18, 'Latex (Bouteille de 5 Lts)', 'bouteille', 800.00, 1, NULL, 18, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(19, 'TAL Sureproof (kit)', 'kit', 4500.00, 1, NULL, 19, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(20, 'Pekay Noir', 'm²', 350.00, 1, NULL, 20, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(21, 'Béton Toupie', 'm³', 5500.00, 1, NULL, 21, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(22, 'Eau Béton (Forfait)', 'forfait', 2000.00, 0, NULL, 22, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(23, 'Skimmer', 'unité', 7000.00, 1, NULL, 23, '2026-02-16 07:42:04', '2026-02-17 09:28:37'),
(24, 'Traversée de Parois', 'unité', 1300.00, 1, NULL, 24, '2026-02-16 07:42:04', '2026-02-17 09:29:35'),
(25, 'Tuyaux 50mm Haute Pression', 'unité', 850.00, 1, NULL, 25, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(26, 'Colle PVC (Forfait)', 'forfait', 500.00, 1, NULL, 26, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(27, 'Câbles électriques 2.5mm2 3 cors', 'mètre', 150.00, 1, NULL, 27, '2026-02-16 07:42:04', '2026-02-17 03:46:58'),
(28, 'Boite de connexion electrique', 'unité', 350.00, 1, NULL, 28, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(29, 'Spot Led', 'unité', 11000.00, 1, NULL, 29, '2026-02-16 07:42:04', '2026-02-17 04:47:01'),
(30, 'Nylon (forfait)', 'forfait', 200.00, 1, NULL, 30, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(31, 'Pinceau (forfait)', 'forfait', 300.00, 1, NULL, 31, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(32, 'Bloc BAB', 'unité', 50.00, 1, NULL, 32, '2026-02-16 07:42:04', '2026-02-17 09:16:18'),
(33, 'Carrelage', 'm²', 1700.00, 1, NULL, 33, '2026-02-16 07:42:04', '2026-02-17 03:48:42'),
(34, 'Carreleur', 'm²', 1300.00, 0, NULL, 34, '2026-02-16 07:42:04', '2026-02-17 03:49:21'),
(35, 'Colle Carreau (sac de 15Kg)', 'sac', 450.00, 1, NULL, 35, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(36, 'Tiles Spacers (forfait)', 'forfait', 200.00, 1, NULL, 36, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(37, 'Joints (1 Kg)', 'kg', 250.00, 1, NULL, 37, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(38, 'Pompe de Circulation', 'unité', 20000.00, 1, NULL, 38, '2026-02-16 07:42:04', '2026-02-17 09:24:23'),
(39, 'Domotique', 'unité', 25000.00, 1, NULL, 39, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(40, 'Filtre à Sable', 'unité', 18000.00, 1, NULL, 40, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(41, 'Pompe de Piscine', 'unité', 20000.00, 1, NULL, 41, '2026-02-16 07:42:04', '2026-02-17 09:24:43'),
(42, 'Panneau Electrique', 'unité', 9000.00, 1, NULL, 42, '2026-02-16 07:42:04', '2026-02-17 09:27:13'),
(43, 'Electricien', 'jour', 2500.00, 0, NULL, 43, '2026-02-16 07:42:04', '2026-02-17 03:50:09'),
(44, 'Plombier', 'jour', 2500.00, 0, NULL, 44, '2026-02-16 07:42:04', '2026-02-17 03:50:21'),
(45, 'Salt Chlorinateur', 'unité', 35000.00, 1, NULL, 45, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(46, 'Buses', 'unité', 750.00, 1, NULL, 46, '2026-02-16 07:42:04', '2026-02-17 09:30:23'),
(47, 'Tuyau Spot Led', 'unité', 450.00, 1, NULL, 47, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(142, 'Boite a Pompe (Fibre de Verre)', 'unité', 20000.00, 1, NULL, 48, '2026-02-17 09:25:18', '2026-02-17 09:25:18'),
(143, 'Silica Sand', 'kg', 2800.00, 1, 18, 49, '2026-02-17 09:26:04', '2026-02-17 09:26:04'),
(144, 'Prise Balais + Traversé de Paroi', 'unité', 1750.00, 1, 18, 50, '2026-02-17 09:31:29', '2026-02-17 09:31:29');

-- --------------------------------------------------------

--
-- Table structure for table `pool_boq_templates`
--

CREATE TABLE `pool_boq_templates` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_default` tinyint(1) DEFAULT '0',
  `template_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pool_boq_templates`
--

INSERT INTO `pool_boq_templates` (`id`, `name`, `description`, `is_default`, `template_data`, `created_at`, `updated_at`) VALUES
(1, 'Modèle par défaut', 'Modèle BOQ piscine par défaut', 1, '{\"base\": [{\"name\": \"1/ Préparation du terrain\", \"is_option\": false, \"display_order\": 1, \"subcategories\": [{\"name\": \"1A/ Fouille\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location de JCB\", \"price_list_name\": \"Location JCB (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.125 * surface_m2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport de matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport évacuation de la terre\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15) * 3\"}], \"display_order\": 1}, {\"name\": \"1B/ Site Railing\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.25 * surface_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL((perimetre_m + 4) / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Nylon (Forfait)\", \"price_list_name\": \"Nylon (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"2/ La Base\", \"is_option\": false, \"display_order\": 2, \"subcategories\": [{\"name\": \"2A/ Compactage de la base\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location dammeuse\", \"price_list_name\": \"Location Dammeuse (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_m2 / 15)\"}], \"display_order\": 1}, {\"name\": \"2B/ Radier\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Crusherrun\", \"price_list_name\": \"Crusherrun\", \"quantity_formula\": \"ceil(volume_base_m3 * 1.6)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour base\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((((largeur / 0.2 * (longueur + 1)) + (longueur / 0.2 * (largeur + 1))) * 2)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour amorce murs\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil(((perimetre_m / 0.2) * (profondeur + 1))/9)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Plastique noir\", \"price_list_name\": \"Plastique noir\", \"quantity_formula\": \"surface_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois de coffrage\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL(perimetre_base_m / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Fer d\'attache (Forfait)\", \"price_list_name\": \"Fer d\'attache (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15) * 2\"}], \"display_order\": 2}, {\"name\": \"2C/ Coulage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"m³\", \"quantity\": 1, \"description\": \"Béton\", \"price_list_name\": \"Béton Toupie\", \"quantity_formula\": \"volume_base_m3\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Eau Béton\", \"price_list_name\": \"Eau Béton (Forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 3}]}, {\"name\": \"3/ Les Murs\", \"is_option\": false, \"display_order\": 3, \"subcategories\": [{\"name\": \"3A/ Montage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"ceil(nombre_blocs_bab / 75)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 barres verticales\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((perimetre_m / 0.2 * profondeur)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y10 barres horizontales\", \"price_list_name\": \"Fer Y10 (barre de 9m)\", \"quantity_formula\": \"ceil(perimetre_m * 2 / 9)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL((longueur * profondeur * 2 + largeur * profondeur * 2) * 40 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil((longueur * profondeur * 2 + largeur * profondeur * 2) * 50 / 1000 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15)\"}], \"display_order\": 1}, {\"name\": \"3B/ Coulage\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"ceil(perimetre_m * profondeur * 0.15 * 0.8 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(perimetre_m * profondeur * 0.15 * 350 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil(perimetre_m * profondeur * 0.15 * 0.4 * 1.5 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15)\"}], \"display_order\": 2}, {\"name\": \"3C/ Crépissage Intérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieur_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15)\"}], \"display_order\": 3}, {\"name\": \"3D/ Crépissage Extérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieur_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_m2 / 15)\"}], \"display_order\": 4}]}, {\"name\": \"4/ Étanchéité\", \"is_option\": false, \"display_order\": 4, \"subcategories\": [{\"name\": \"4A/ Étanchéité Intérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 15) * 2\"}, {\"unit\": \"kit\", \"quantity\": 1, \"description\": \"TAL Sureproof\", \"price_list_name\": \"TAL Sureproof (kit)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"4B/ Étanchéité Extérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 15) * 2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Pekay Noir\", \"price_list_name\": \"Pekay Noir\", \"quantity_formula\": \"CEIL(surface_interieur_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"5/ Plomberie & Électricité Structure\", \"is_option\": false, \"display_order\": 5, \"subcategories\": [{\"name\": \"5A/ Plomberie\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"CEIL(surface_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Skimmer\", \"price_list_name\": \"Skimmer\", \"quantity_formula\": \"CEIL(volume_m3 / 36)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Traversée de parois\", \"price_list_name\": \"Traversée de Parois\", \"quantity_formula\": \"CEIL(volume_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Buses\", \"price_list_name\": \"Buses\", \"quantity_formula\": \"CEIL(volume_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyaux 50mm Haute Pression\", \"price_list_name\": \"Tuyaux 50mm Haute Pression\", \"quantity_formula\": \"CEIL(perimetre_m * 2 / 5.8)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Colle PVC (Forfait)\", \"price_list_name\": \"Colle PVC (Forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"5B/ Électricité\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"CEIL(surface_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyau spot led\", \"price_list_name\": \"Tuyau Spot Led\", \"quantity_formula\": \"CEIL(perimetre_m / 5.8)\"}, {\"unit\": \"mètre\", \"quantity\": 1, \"description\": \"Câbles électriques 2.5mm² 3 cors\", \"price_list_name\": \"Câbles électriques 2.5mm2 3 cors\", \"quantity_formula\": \"ceil(perimetre_m)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Boite de connexion electrique\", \"price_list_name\": \"Boite de connexion electrique\", \"quantity_formula\": \"CEIL(perimetre_m / 5.8)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}], \"options\": [{\"name\": \"OPT1 Électrique\", \"is_option\": true, \"display_order\": 10, \"subcategories\": [{\"name\": \"OPT1A Éclairage\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Spot Led\", \"price_list_name\": \"Spot Led\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT1B Autres\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Circulation\", \"price_list_name\": \"Pompe de Circulation\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Domotique\", \"price_list_name\": \"Domotique\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT2 Structure\", \"is_option\": true, \"display_order\": 11, \"subcategories\": [{\"name\": \"OPT2A Marches de 60cm de large\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 2, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"2\"}, {\"unit\": \"unité\", \"quantity\": 20, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"20\"}, {\"unit\": \"sac\", \"quantity\": 10, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"10\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 2, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"2\"}], \"display_order\": 1}, {\"name\": \"OPT2B Banc (longueur ou largeur)\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 5, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"5\"}, {\"unit\": \"unité\", \"quantity\": 30, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"30\"}, {\"unit\": \"sac\", \"quantity\": 20, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"20\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 4, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"4\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieur_m2 / 35)\"}], \"display_order\": 2}]}, {\"name\": \"OPT3 Filtration\", \"is_option\": true, \"display_order\": 12, \"subcategories\": [{\"name\": \"OPT3A Filtration Basique\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Filtre à Sable\", \"price_list_name\": \"Filtre à Sable\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Piscine\", \"price_list_name\": \"Pompe de Piscine\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Panneau Electrique\", \"price_list_name\": \"Panneau Electrique\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT3B Filtration Améliorée\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Salt Chlorinateur\", \"price_list_name\": \"Salt Chlorinateur\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT4 Finitions\", \"is_option\": true, \"display_order\": 13, \"subcategories\": [{\"name\": \"OPT4A Carrelage\", \"lines\": [{\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"ceil(surface_interieur_m2)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"ceil(surface_interieur_m2)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieur_m2 / 35)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieur_m2 / 35)\"}], \"display_order\": 1}]}]}', '2026-02-17 03:03:56', '2026-02-21 20:05:13'),
(2, 'Modèle Piscine en L', 'Modèle BOQ piscine en L', 0, '{\"base\": [{\"name\": \"1/ Préparation du terrain\", \"is_option\": false, \"display_order\": 1, \"subcategories\": [{\"name\": \"1A/ Fouille\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location de JCB\", \"price_list_name\": \"Location JCB (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.125 * surface_l_m2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport de matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport évacuation de la terre\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15) * 3\"}], \"display_order\": 1}, {\"name\": \"1B/ Site Railing\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.25 * surface_l_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL((perimetre_l_m + 4) / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Nylon (Forfait)\", \"price_list_name\": \"Nylon (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"2/ La Base\", \"is_option\": false, \"display_order\": 2, \"subcategories\": [{\"name\": \"2A/ Compactage de la base\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location dammeuse\", \"price_list_name\": \"Location Dammeuse (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15)\"}], \"display_order\": 1}, {\"name\": \"2B/ Radier\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Crusherrun\", \"price_list_name\": \"Crusherrun\", \"quantity_formula\": \"ceil(volume_base_l_m3 * 1.6)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour base\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((((largeur_la / 0.2 * (longueur_la + 1)) + (longueur_la / 0.2 * (largeur_la + 1))) * 2)/9)+ceil((((largeur_lb / 0.2 * (longueur_lb + 1)) + (longueur_lb / 0.2 * (largeur_lb + 1))) * 2)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour amorce murs\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil(((perimetre_l_m / 0.2) * (profondeur_la + 1))/9)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Plastique noir\", \"price_list_name\": \"Plastique noir\", \"quantity_formula\": \"surface_l_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois de coffrage\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL(perimetre_base_l_m / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Fer d\'attache (Forfait)\", \"price_list_name\": \"Fer d\'attache (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15) * 2\"}], \"display_order\": 2}, {\"name\": \"2C/ Coulage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"m³\", \"quantity\": 1, \"description\": \"Béton\", \"price_list_name\": \"Béton Toupie\", \"quantity_formula\": \"volume_base_l_m3\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Eau Béton\", \"price_list_name\": \"Eau Béton (Forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 3}]}, {\"name\": \"3/ Les Murs\", \"is_option\": false, \"display_order\": 3, \"subcategories\": [{\"name\": \"3A/ Montage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"ceil(nb_blocs_bab_l / 75)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 barres verticales\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((perimetre_l_m / 0.2 * profondeur_la)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y10 barres horizontales\", \"price_list_name\": \"Fer Y10 (barre de 9m)\", \"quantity_formula\": \"ceil(perimetre_l_m * 2 / 9)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL((longueur_la * profondeur_la * 2 + largeur_la * profondeur_la * 2) * 40 / 25 * 1.1)+CEIL((longueur_lb * profondeur_lb * 2 + largeur_lb * profondeur_lb * 2) * 40 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil((longueur_la * profondeur_la * 2 + largeur_la * profondeur_la * 2) * 50 / 1000 * 1.1)+ceil((longueur_lb * profondeur_lb * 2 + largeur_lb * profondeur_lb * 2) * 50 / 1000 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Blocs BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"nb_blocs_bab_l\"}], \"display_order\": 1}, {\"name\": \"3B/ Coulage\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"ceil(perimetre_l_m * profondeur_la * 0.15 * 0.8 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(perimetre_l_m * profondeur_la * 0.15 * 350 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil(perimetre_l_m * profondeur_la * 0.15 * 0.4 * 1.5 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15)\"}], \"display_order\": 2}, {\"name\": \"3C/ Crépissage Intérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieure_l_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15)\"}], \"display_order\": 3}, {\"name\": \"3D/ Crépissage Extérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieure_l_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15)\"}], \"display_order\": 4}]}, {\"name\": \"4/ Étanchéité\", \"is_option\": false, \"display_order\": 4, \"subcategories\": [{\"name\": \"4A/ Étanchéité Intérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 15) * 2\"}, {\"unit\": \"kit\", \"quantity\": 1, \"description\": \"TAL Sureproof\", \"price_list_name\": \"TAL Sureproof (kit)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"4B/ Étanchéité Extérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 15) * 2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Pekay Noir\", \"price_list_name\": \"Pekay Noir\", \"quantity_formula\": \"CEIL(surface_interieure_l_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"5/ Plomberie & Électricité Structure\", \"is_option\": false, \"display_order\": 5, \"subcategories\": [{\"name\": \"5A/ Plomberie\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Skimmer\", \"price_list_name\": \"Skimmer\", \"quantity_formula\": \"CEIL(volume_l_m3 / 36)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Traversée de parois\", \"price_list_name\": \"Traversée de Parois\", \"quantity_formula\": \"CEIL(volume_l_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Buses\", \"price_list_name\": \"Buses\", \"quantity_formula\": \"CEIL(volume_l_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyaux 50mm Haute Pression\", \"price_list_name\": \"Tuyaux 50mm Haute Pression\", \"quantity_formula\": \"CEIL(perimetre_l_m * 2 / 5.8)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Colle PVC (Forfait)\", \"price_list_name\": \"Colle PVC (Forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"5B/ Électricité\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"CEIL(surface_l_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyau spot led\", \"price_list_name\": \"Tuyau Spot Led\", \"quantity_formula\": \"CEIL(perimetre_l_m / 5.8)\"}, {\"unit\": \"mètre\", \"quantity\": 1, \"description\": \"Câbles électriques 2.5mm² 3 cors\", \"price_list_name\": \"Câbles électriques 2.5mm2 3 cors\", \"quantity_formula\": \"ceil(perimetre_l_m)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Boite de connexion electrique\", \"price_list_name\": \"Boite de connexion electrique\", \"quantity_formula\": \"CEIL(perimetre_l_m / 5.8)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}], \"options\": [{\"name\": \"OPT1 Électrique\", \"is_option\": true, \"display_order\": 10, \"subcategories\": [{\"name\": \"OPT1A Éclairage\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Spot Led\", \"price_list_name\": \"Spot Led\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT1B Autres\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Circulation\", \"price_list_name\": \"Pompe de Circulation\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Domotique\", \"price_list_name\": \"Domotique\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT2 Structure\", \"is_option\": true, \"display_order\": 11, \"subcategories\": [{\"name\": \"OPT2A Marches de 60cm de large\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 2, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"2\"}, {\"unit\": \"unité\", \"quantity\": 20, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"20\"}, {\"unit\": \"sac\", \"quantity\": 10, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"10\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 2, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"2\"}], \"display_order\": 1}, {\"name\": \"OPT2B Banc (longueur ou largeur)\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 5, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"5\"}, {\"unit\": \"unité\", \"quantity\": 30, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"30\"}, {\"unit\": \"sac\", \"quantity\": 20, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"20\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 4, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"4\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_l_m2 / 35)\"}], \"display_order\": 2}]}, {\"name\": \"OPT3 Filtration\", \"is_option\": true, \"display_order\": 12, \"subcategories\": [{\"name\": \"OPT3A Filtration Basique\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Filtre à Sable\", \"price_list_name\": \"Filtre à Sable\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Piscine\", \"price_list_name\": \"Pompe de Piscine\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Panneau Electrique\", \"price_list_name\": \"Panneau Electrique\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT3B Filtration Améliorée\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Salt Chlorinateur\", \"price_list_name\": \"Salt Chlorinateur\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT4 Finitions\", \"is_option\": true, \"display_order\": 13, \"subcategories\": [{\"name\": \"OPT4A Carrelage\", \"lines\": [{\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"ceil(surface_interieure_l_m2)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"ceil(surface_interieure_l_m2)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_l_m2 / 35)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_l_m2 / 35)\"}], \"display_order\": 1}]}]}', '2026-02-21 17:53:17', '2026-02-23 06:02:01');
INSERT INTO `pool_boq_templates` (`id`, `name`, `description`, `is_default`, `template_data`, `created_at`, `updated_at`) VALUES
(3, 'Modèle Piscine en T', 'Modèle BOQ piscine en T', 0, '{\"base\": [{\"name\": \"1/ Préparation du terrain\", \"is_option\": false, \"display_order\": 1, \"subcategories\": [{\"name\": \"1A/ Fouille\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location de JCB\", \"price_list_name\": \"Location JCB (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.125 * surface_t_m2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport de matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport évacuation de la terre\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15) * 3\"}], \"display_order\": 1}, {\"name\": \"1B/ Site Railing\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"0.25 * surface_t_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL((perimetre_t_m + 4) / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Nylon (Forfait)\", \"price_list_name\": \"Nylon (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"2/ La Base\", \"is_option\": false, \"display_order\": 2, \"subcategories\": [{\"name\": \"2A/ Compactage de la base\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Location dammeuse\", \"price_list_name\": \"Location Dammeuse (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15)\"}], \"display_order\": 1}, {\"name\": \"2B/ Radier\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Crusherrun\", \"price_list_name\": \"Crusherrun\", \"quantity_formula\": \"ceil(volume_base_t_m3 * 1.6)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour base\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((((largeur_ta / 0.2 * (longueur_ta + 1)) + (longueur_ta / 0.2 * (largeur_ta + 1))) * 2)/9)+ceil((((largeur_tb / 0.2 * (longueur_tb + 1)) + (longueur_tb / 0.2 * (largeur_tb + 1))) * 2)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 pour amorce murs\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil(((perimetre_t_m / 0.2) * (profondeur_ta + 1))/9)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Plastique noir\", \"price_list_name\": \"Plastique noir\", \"quantity_formula\": \"surface_t_m2\"}, {\"unit\": \"planche\", \"quantity\": 1, \"description\": \"Bois de coffrage\", \"price_list_name\": \"Bois de coffrage (Planche de 2.4m x 15cm)\", \"quantity_formula\": \"CEIL(perimetre_base_t_m / 2.4)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Clous (Forfait)\", \"price_list_name\": \"Clous (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Fer d\'attache (Forfait)\", \"price_list_name\": \"Fer d\'attache (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15) * 2\"}], \"display_order\": 2}, {\"name\": \"2C/ Coulage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"1\"}, {\"unit\": \"m³\", \"quantity\": 1, \"description\": \"Béton\", \"price_list_name\": \"Béton Toupie\", \"quantity_formula\": \"volume_base_t_m3\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Eau Béton\", \"price_list_name\": \"Eau Béton (Forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 3}]}, {\"name\": \"3/ Les Murs\", \"is_option\": false, \"display_order\": 3, \"subcategories\": [{\"name\": \"3A/ Montage\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"ceil(nb_blocs_bab_t / 75)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y12 barres verticales\", \"price_list_name\": \"Fer Y12 (barre de 9m)\", \"quantity_formula\": \"ceil((perimetre_t_m / 0.2 * profondeur_ta)/9)\"}, {\"unit\": \"barre\", \"quantity\": 1, \"description\": \"Fer Y10 barres horizontales\", \"price_list_name\": \"Fer Y10 (barre de 9m)\", \"quantity_formula\": \"ceil(perimetre_t_m * 2 / 9)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL((longueur_ta * profondeur_ta * 2 + largeur_ta * profondeur_ta * 2) * 40 / 25 * 1.1)+CEIL((longueur_tb * profondeur_tb * 2 + largeur_tb * profondeur_tb * 2) * 40 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil((longueur_ta * profondeur_ta * 2 + largeur_ta * profondeur_ta * 2) * 50 / 1000 * 1.1)+ceil((longueur_tb * profondeur_tb * 2 + largeur_tb * profondeur_tb * 2) * 50 / 1000 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15)\"}], \"display_order\": 1}, {\"name\": \"3B/ Coulage\", \"lines\": [{\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"ceil(perimetre_t_m * profondeur_ta * 0.15 * 0.8 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(perimetre_t_m * profondeur_ta * 0.15 * 350 / 25 * 1.1)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand .4\", \"price_list_name\": \"Rocksand .4 (tonne)\", \"quantity_formula\": \"ceil(perimetre_t_m * profondeur_ta * 0.15 * 0.4 * 1.5 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15)\"}], \"display_order\": 2}, {\"name\": \"3C/ Crépissage Intérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieure_t_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15)\"}], \"display_order\": 3}, {\"name\": \"3D/ Crépissage Extérieur\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 35)\"}, {\"unit\": \"tonne\", \"quantity\": 1, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"ceil(surface_interieure_t_m2 * 25 / 1000 * 1.1)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Ciment\", \"price_list_name\": \"Colle Ciment (sac de 15Kg)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 * 2 / 15 * 1.1)\"}, {\"unit\": \"bouteille\", \"quantity\": 1, \"description\": \"Latex\", \"price_list_name\": \"Latex (Bouteille de 5 Lts)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 10)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 * 5 / 25 * 1.1)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport Matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15)\"}], \"display_order\": 4}]}, {\"name\": \"4/ Étanchéité\", \"is_option\": false, \"display_order\": 4, \"subcategories\": [{\"name\": \"4A/ Étanchéité Intérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 15) * 2\"}, {\"unit\": \"kit\", \"quantity\": 1, \"description\": \"TAL Sureproof\", \"price_list_name\": \"TAL Sureproof (kit)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"4B/ Étanchéité Extérieure\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 15) * 2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Pekay Noir\", \"price_list_name\": \"Pekay Noir\", \"quantity_formula\": \"CEIL(surface_interieure_t_m2 / 42) * 7\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Pinceau (Forfait)\", \"price_list_name\": \"Pinceau (forfait)\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"5/ Plomberie & Électricité Structure\", \"is_option\": false, \"display_order\": 5, \"subcategories\": [{\"name\": \"5A/ Plomberie\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Skimmer\", \"price_list_name\": \"Skimmer\", \"quantity_formula\": \"CEIL(volume_t_m3 / 36)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Traversée de parois\", \"price_list_name\": \"Traversée de Parois\", \"quantity_formula\": \"CEIL(volume_t_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Buses\", \"price_list_name\": \"Buses\", \"quantity_formula\": \"CEIL(volume_t_m3 / 36) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyaux 50mm Haute Pression\", \"price_list_name\": \"Tuyaux 50mm Haute Pression\", \"quantity_formula\": \"CEIL(perimetre_t_m * 2 / 5.8)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Colle PVC (Forfait)\", \"price_list_name\": \"Colle PVC (Forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"5B/ Électricité\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"CEIL(surface_t_m2 / 15) * 2\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Tuyau spot led\", \"price_list_name\": \"Tuyau Spot Led\", \"quantity_formula\": \"CEIL(perimetre_t_m / 5.8)\"}, {\"unit\": \"mètre\", \"quantity\": 1, \"description\": \"Câbles électriques 2.5mm² 3 cors\", \"price_list_name\": \"Câbles électriques 2.5mm2 3 cors\", \"quantity_formula\": \"ceil(perimetre_t_m)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Boite de connexion electrique\", \"price_list_name\": \"Boite de connexion electrique\", \"quantity_formula\": \"CEIL(perimetre_t_m / 5.8)\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Transport matériaux\", \"price_list_name\": \"Transport Matériaux\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}], \"options\": [{\"name\": \"OPT1 Électrique\", \"is_option\": true, \"display_order\": 10, \"subcategories\": [{\"name\": \"OPT1A Éclairage\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Spot Led\", \"price_list_name\": \"Spot Led\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT1B Autres\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Circulation\", \"price_list_name\": \"Pompe de Circulation\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Domotique\", \"price_list_name\": \"Domotique\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT2 Structure\", \"is_option\": true, \"display_order\": 11, \"subcategories\": [{\"name\": \"OPT2A Marches de 60cm de large\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 2, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"2\"}, {\"unit\": \"unité\", \"quantity\": 20, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"20\"}, {\"unit\": \"sac\", \"quantity\": 10, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"10\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"tonne\", \"quantity\": 2, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"2\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 2, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"2\"}], \"display_order\": 1}, {\"name\": \"OPT2B Banc (longueur ou largeur)\", \"lines\": [{\"unit\": \"jour\", \"quantity\": 5, \"description\": \"Main d\'oeuvre\", \"price_list_name\": \"Main d\'oeuvre (1 jour)\", \"quantity_formula\": \"5\"}, {\"unit\": \"unité\", \"quantity\": 30, \"description\": \"Bloc BAB\", \"price_list_name\": \"Bloc BAB\", \"quantity_formula\": \"30\"}, {\"unit\": \"sac\", \"quantity\": 20, \"description\": \"Ciment\", \"price_list_name\": \"Ciment (sac de 25kg)\", \"quantity_formula\": \"20\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Rocksand 0.2\", \"price_list_name\": \"Rocksand .2 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"tonne\", \"quantity\": 3, \"description\": \"Macadam 3/8\", \"price_list_name\": \"Macadam 3/8 (tonne)\", \"quantity_formula\": \"3\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"1\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"1\"}, {\"unit\": \"sac\", \"quantity\": 4, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"4\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_t_m2 / 35)\"}], \"display_order\": 2}]}, {\"name\": \"OPT3 Filtration\", \"is_option\": true, \"display_order\": 12, \"subcategories\": [{\"name\": \"OPT3A Filtration Basique\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Filtre à Sable\", \"price_list_name\": \"Filtre à Sable\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Pompe de Piscine\", \"price_list_name\": \"Pompe de Piscine\", \"quantity_formula\": \"1\"}, {\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Panneau Electrique\", \"price_list_name\": \"Panneau Electrique\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Électricien\", \"price_list_name\": \"Electricien\", \"quantity_formula\": \"1\"}, {\"unit\": \"jour\", \"quantity\": 1, \"description\": \"Plombier\", \"price_list_name\": \"Plombier\", \"quantity_formula\": \"1\"}], \"display_order\": 1}, {\"name\": \"OPT3B Filtration Améliorée\", \"lines\": [{\"unit\": \"unité\", \"quantity\": 1, \"description\": \"Salt Chlorinateur\", \"price_list_name\": \"Salt Chlorinateur\", \"quantity_formula\": \"1\"}], \"display_order\": 2}]}, {\"name\": \"OPT4 Finitions\", \"is_option\": true, \"display_order\": 13, \"subcategories\": [{\"name\": \"OPT4A Carrelage\", \"lines\": [{\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carrelage\", \"price_list_name\": \"Carrelage\", \"quantity_formula\": \"ceil(surface_interieure_t_m2)\"}, {\"unit\": \"m²\", \"quantity\": 1, \"description\": \"Carreleur\", \"price_list_name\": \"Carreleur\", \"quantity_formula\": \"ceil(surface_interieure_t_m2)\"}, {\"unit\": \"sac\", \"quantity\": 1, \"description\": \"Colle Carreau\", \"price_list_name\": \"Colle Carreau (sac de 15Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_t_m2 / 35)\"}, {\"unit\": \"forfait\", \"quantity\": 1, \"description\": \"Tiles Spacers (Forfait)\", \"price_list_name\": \"Tiles Spacers (forfait)\", \"quantity_formula\": \"1\"}, {\"unit\": \"kg\", \"quantity\": 1, \"description\": \"Joints\", \"price_list_name\": \"Joints (1 Kg)\", \"quantity_formula\": \"CEIL(20 * surface_interieure_t_m2 / 35)\"}], \"display_order\": 1}]}]}', '2026-02-23 04:04:17', '2026-02-23 04:21:28');

-- --------------------------------------------------------

--
-- Table structure for table `pool_boq_variables`
--

CREATE TABLE `pool_boq_variables` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `formula` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Formula using other variable names or pool dimensions (longueur, largeur, profondeur)',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pool_boq_variables`
--

INSERT INTO `pool_boq_variables` (`id`, `name`, `label`, `unit`, `formula`, `display_order`, `created_at`, `updated_at`) VALUES
(2, 'volume_m3', 'Volume M3', 'm³', 'ceil(surface_m2 * profondeur)', 2, '2026-02-16 07:42:04', '2026-02-21 13:01:58'),
(3, 'perimetre_m', 'Périmètre M', 'm', 'ceil(longueur * 2 + largeur * 2)', 3, '2026-02-16 07:42:04', '2026-02-21 13:02:10'),
(4, 'perimetre_base_m', 'Périmètre Base M', 'm', 'ceil((longueur + 1) * 2 + (largeur + 1) * 2)', 4, '2026-02-16 07:42:04', '2026-02-21 13:02:27'),
(5, 'surface_base_m2', 'Surface Base M2', 'm²', 'ceil((longueur + 1) * (largeur + 1))', 5, '2026-02-16 07:42:04', '2026-02-21 13:02:43'),
(6, 'epaisseur_base_m', 'Épaisseur Base M', 'm', '0.25', 6, '2026-02-16 07:42:04', '2026-02-16 07:42:04'),
(7, 'volume_base_m3', 'Volume Base M3', 'm³', 'ceil(epaisseur_base_m * surface_base_m2)', 7, '2026-02-16 07:42:04', '2026-02-21 13:03:06'),
(8, 'nombre_blocs_bab', 'Nombre de Blocs BAB', 'blocs', 'ceil((perimetre_m / 0.4)) * floor((profondeur / 0.2))', 8, '2026-02-16 07:42:04', '2026-02-21 17:37:57'),
(9, 'surface_interieur_m2', 'Surface Intérieur M2', 'm²', 'ceil(perimetre_m * profondeur + surface_m2)', 9, '2026-02-16 07:42:04', '2026-02-21 13:03:52'),
(20, 'surface_l_m2', 'Surface L M2', 'm2', 'ceil((longueur_la*largeur_la)+(longueur_lb*largeur_lb))', 10, '2026-02-21 12:31:43', '2026-02-21 13:04:09'),
(21, 'volume_l_m3', 'Volume L M3', 'm3', 'ceil((longueur_la*largeur_la*profondeur_la)+(longueur_lb*largeur_lb*profondeur_lb))', 11, '2026-02-21 12:33:35', '2026-02-21 13:04:24'),
(22, 'perimetre_l_m', 'Périmétre L M', 'm', 'ceil(longueur_la+largeur_la+longueur_lb+largeur_lb+(longueur_la-longueur_lb)+(largeur_la+largeur_lb))', 12, '2026-02-21 12:38:54', '2026-02-21 13:04:40'),
(23, 'perimetre_base_l_m', 'Périmètre Base L M', 'm', 'ceil(longueur_la+1+largeur_la+1+longueur_lb+1+largeur_lb+.5+(longueur_la-longueur_lb+1)+(largeur_la+largeur_lb+.5))', 13, '2026-02-21 12:51:09', '2026-02-21 13:04:54'),
(24, 'surface_base_l_m2', 'Surface Base L M2', 'm2', 'ceil(((longueur_la+1)*(largeur_la+1))+((longueur_lb+1)*largeur_lb))', 14, '2026-02-21 12:53:41', '2026-02-21 13:01:25'),
(25, 'volume_base_l_m3', 'Volume Base L M3', 'm3', 'ceil(epaisseur_base_m * surface_base_l_m2)', 15, '2026-02-21 12:54:56', '2026-02-21 13:01:08'),
(26, 'nb_blocs_bab_l', 'Nombre de Blocs BAB - L', 'blocs', 'ceil((perimetre_l_m / 0.4)) * floor((profondeur_la / 0.2))', 16, '2026-02-21 13:00:33', '2026-02-21 17:38:24'),
(27, 'surface_interieure_l_m2', 'Surface Intérieure L M2', 'm2', 'ceil(perimetre_l_m * profondeur_la + surface_l_m2)', 17, '2026-02-21 13:06:26', '2026-02-21 13:06:26'),
(28, 'surface_m2', 'Surface M2', 'm2', 'ceil(longueur*largeur)', 0, '2026-02-21 17:36:31', '2026-02-21 17:36:45'),
(29, 'surface_t_m2', 'Surface T M2', 'm2', 'ceil((longueur_ta*largeur_ta)+(longueur_tb*largeur_tb))', 18, '2026-02-23 03:04:10', '2026-02-23 03:04:10'),
(30, 'volume_t_m3', 'Volume T M3', 'm3', 'ceil((longueur_ta*largeur_ta*profondeur_ta)+(longueur_tb*largeur_tb*profondeur_tb))', 19, '2026-02-23 03:07:14', '2026-02-23 03:07:14'),
(31, 'perimetre_t_m', 'Perimetre T M', 'm', 'ceil(longueur_ta*2+largeur_ta*2+largeur_tb*2)', 20, '2026-02-23 03:14:37', '2026-02-23 03:23:38'),
(32, 'perimetre_base_t_m', 'Perimetre Base T M', 'm', 'if(longueur_ta>longueur_tb,ceil((longueur_ta+1)+(longueur_ta-longueur_tb+1)+(longueur_tb+1)+(largeur_ta+1)*2+(largeur_tb+0.5)*2),ceil((longueur_tb+1)+(longueur_tb-longueur_ta+1)+(longueur_ta+1)+(largeur_tb+1)*2+(largeur_ta+0.5)*2))', 21, '2026-02-23 03:30:48', '2026-02-23 03:30:48'),
(33, 'surface_base_t_m2', 'Surface Base T M2', 'm2', 'ceil(((longueur_ta+1)*(largeur_ta+1))+((longueur_tb+1)*largeur_tb))', 22, '2026-02-23 03:36:00', '2026-02-23 03:36:00'),
(34, 'volume_base_t_m3', 'Volume Base T M3', 'm3', 'ceil(epaisseur_base_m * surface_base_t_m2)', 23, '2026-02-23 03:37:27', '2026-02-23 03:37:27'),
(35, 'nb_blocs_bab_t', 'Nombre de Blocs BAB T', 'bloc', 'ceil((perimetre_t_m / 0.4)) * floor((profondeur_ta / 0.2))', 24, '2026-02-23 03:39:09', '2026-02-23 03:39:09'),
(36, 'surface_interieure_t_m2', 'Surface Intérieure T M2', 'm2', 'ceil(perimetre_t_m * profondeur_ta + surface_t_m2)', 25, '2026-02-23 03:40:26', '2026-02-23 03:41:12');

-- --------------------------------------------------------

--
-- Table structure for table `professional_credit_transactions`
--

CREATE TABLE `professional_credit_transactions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` enum('pack_purchase','quote_created','quote_validated','boq_requested','model_request','production_deduction') NOT NULL,
  `quote_id` int DEFAULT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `professional_credit_transactions`
--

INSERT INTO `professional_credit_transactions` (`id`, `user_id`, `amount`, `reason`, `quote_id`, `balance_after`, `created_at`) VALUES
(1, 2, 10000.00, 'pack_purchase', NULL, 10000.00, '2026-02-25 20:12:16'),
(2, 2, -500.00, 'quote_created', NULL, 9500.00, '2026-03-02 07:06:03'),
(3, 2, -500.00, 'quote_created', NULL, 9000.00, '2026-03-02 07:33:28'),
(4, 2, -1000.00, 'quote_validated', 1, 8000.00, '2026-03-02 08:04:57'),
(5, 2, -1500.00, 'boq_requested', 1, 6500.00, '2026-03-02 08:05:19'),
(6, 2, -1500.00, 'boq_requested', 1, 5000.00, '2026-03-02 08:05:37'),
(7, 2, -1500.00, 'boq_requested', 1, 3500.00, '2026-03-02 09:58:15'),
(8, 2, -1500.00, 'boq_requested', 1, 2000.00, '2026-03-02 11:43:12'),
(9, 2, -500.00, 'quote_created', NULL, 1500.00, '2026-03-02 14:40:49'),
(10, 2, -1000.00, 'quote_validated', 2, 500.00, '2026-03-02 14:41:27'),
(11, 2, 10000.00, 'pack_purchase', NULL, 10500.00, '2026-03-02 14:41:51'),
(12, 2, -1500.00, 'boq_requested', 2, 9000.00, '2026-03-02 14:42:13'),
(13, 2, -500.00, 'quote_created', NULL, 8500.00, '2026-03-02 14:57:17');

-- --------------------------------------------------------

--
-- Table structure for table `professional_model_requests`
--

CREATE TABLE `professional_model_requests` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `description` text NOT NULL,
  `container_20ft_count` int NOT NULL DEFAULT '0',
  `container_40ft_count` int NOT NULL DEFAULT '0',
  `bedrooms` int NOT NULL DEFAULT '0',
  `bathrooms` int NOT NULL DEFAULT '0',
  `sketch_url` varchar(500) DEFAULT NULL,
  `status` enum('pending','in_review','completed','rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professional_packs`
--

CREATE TABLE `professional_packs` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '10000.00',
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `professional_packs`
--

INSERT INTO `professional_packs` (`id`, `user_id`, `amount`, `paid_at`, `notes`, `created_at`) VALUES
(1, 2, 10000.00, '2026-02-25 20:12:15', NULL, '2026-02-25 20:12:15'),
(2, 2, 10000.00, '2026-03-02 14:41:51', NULL, '2026-03-02 14:41:51');

-- --------------------------------------------------------

--
-- Table structure for table `professional_profiles`
--

CREATE TABLE `professional_profiles` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `company_name` varchar(255) NOT NULL DEFAULT '',
  `address` text,
  `vat_number` varchar(100) DEFAULT NULL,
  `brn_number` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `sunbox_margin_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `credits` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `domain` varchar(255) DEFAULT NULL COMMENT 'Pro site domain (e.g. poolbuilder.mu)',
  `api_token` varchar(64) DEFAULT NULL COMMENT 'Unique API token for Sunbox bridge auth',
  `db_name` varchar(255) NOT NULL DEFAULT '' COMMENT 'Pro site DB name',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `professional_profiles`
--

INSERT INTO `professional_profiles` (`id`, `user_id`, `company_name`, `address`, `vat_number`, `brn_number`, `phone`, `logo_url`, `sunbox_margin_percent`, `credits`, `is_active`, `domain`, `api_token`, `db_name`, `created_at`, `updated_at`) VALUES
(1, 2, 'B-Creative', '', '', '', '', '/uploads/sketches/sketch-20260303-031053-6695e5a1.jpg', 0.00, 8500.00, 1, 'mrbcreativecontracting.com', '700ece1ad44b88c067261730709afe6100d6769927f0fa0240be1b4ba02dee94', 'mauriti2_sunbox_mauritius_bcreative', '2026-02-25 19:54:35', '2026-03-03 04:11:01');

-- --------------------------------------------------------

--
-- Table structure for table `pro_model_overrides`
--

CREATE TABLE `pro_model_overrides` (
  `id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'professional user id',
  `model_id` int NOT NULL COMMENT 'reference to models.id on main Sunbox DB',
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Rs amount to add (positive) or subtract (negative) from base price',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0 = hidden on pro site',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pro_model_overrides`
--

INSERT INTO `pro_model_overrides` (`id`, `user_id`, `model_id`, `price_adjustment`, `is_enabled`, `created_at`, `updated_at`) VALUES
(1, 2, 19, 0.00, 1, '2026-03-01 19:36:37', '2026-03-03 04:11:01'),
(2, 2, 20, 0.00, 1, '2026-03-01 19:36:37', '2026-03-03 04:11:01'),
(3, 2, 15, 0.00, 1, '2026-03-01 19:36:38', '2026-03-03 04:11:01'),
(4, 2, 18, 0.00, 1, '2026-03-01 19:36:38', '2026-03-03 04:11:01'),
(5, 2, 14, 0.00, 1, '2026-03-01 19:36:38', '2026-03-03 04:11:02'),
(6, 2, 12, 0.00, 1, '2026-03-01 19:36:38', '2026-03-03 04:11:02');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_reports`
--

CREATE TABLE `purchase_reports` (
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
-- Dumping data for table `purchase_reports`
--

INSERT INTO `purchase_reports` (`id`, `quote_id`, `quote_reference`, `model_name`, `status`, `total_amount`, `created_at`, `updated_at`) VALUES
(4, 17, 'WCQ-202603-000017', 'Sanjiv (Extension avec 2 conteneurs)', 'in_progress', 2074830.00, '2026-03-02 11:56:21', '2026-03-02 11:56:21'),
(5, 14, 'WPQ-202602-000014', 'Piscine Rectangulaire', 'in_progress', 237710.00, '2026-03-02 14:22:09', '2026-03-02 14:22:09');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_report_items`
--

CREATE TABLE `purchase_report_items` (
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
-- Dumping data for table `purchase_report_items`
--

INSERT INTO `purchase_report_items` (`id`, `report_id`, `supplier_name`, `category_name`, `description`, `quantity`, `unit`, `unit_price`, `total_price`, `is_ordered`, `is_option`, `display_order`) VALUES
(118, 4, 'Electricien', 'Electricité', 'Electricien', 1.000, 'forfait', 20000.00, 20000.00, 0, 0, 0),
(119, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 x Fenêtres dans les salles de bain 500mm x 500mm', 2.000, 'unité', 4000.00, 8000.00, 0, 0, 1),
(120, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', 'Panneaux fixes (Terrasse)', 2.000, 'unité', 15000.00, 30000.00, 0, 0, 2),
(121, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '1 Porte Galendage 2000 x 2100 mm (Salle à Manger)', 1.000, 'unité', 41000.00, 41000.00, 0, 0, 3),
(122, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 x Panneaux Fixe 2000 x 2100mm (Salle à Manger)', 2.000, 'unité', 12800.00, 25600.00, 0, 0, 4),
(123, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 Portes Coullissantes 3 vantaux 3500 x 2100 mm (Chambres)', 2.000, 'unité', 51500.00, 103000.00, 0, 0, 5),
(124, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', '2 Portes Coullissantes 2300 x 2100 mm (Chambres)', 2.000, 'unité', 32000.00, 64000.00, 0, 0, 6),
(125, 4, 'Fabriquant Aluminium', 'Ouvertures en Aluminium', 'Transport', 1.000, 'unité', 5000.00, 5000.00, 0, 0, 7),
(126, 4, 'Fournisseur non défini', 'Transport', 'Camion Conteneur', 4.000, 'unité', 12500.00, 50000.00, 0, 0, 8),
(127, 4, 'Fournisseur non défini', 'Revêtement des Sols', 'SPC & Plynthes (inc Installation)', 30.000, 'm²', 1200.00, 36000.00, 0, 0, 9),
(128, 4, 'Fournisseur non défini', 'Ouvertures en Bois', '4 x Portes en bois de 800mm pour les salles de bain et les 2 chambres', 4.000, 'unité', 24000.00, 96000.00, 0, 0, 10),
(129, 4, 'Jean Eric Basraz', 'Revêtement des Sols', 'Main d\'Oeuvre (Béton et SPC)', 6.000, 'jour', 2500.00, 15000.00, 0, 0, 11),
(130, 4, 'Medlog', 'Structure', '2 x Containeurs de 6m reconditionnés, Réparation si nécessaire, Traitement antirouille, Peinture (Choix de la couleur avant la production), 2 Toits à 1 pente en Tole,avec isolation en laine de verre (Choix de la couleur avant la production), Habillage Intérieur et Extérieur', 2.000, 'unité', 350000.00, 700000.00, 0, 0, 12),
(131, 4, 'Palco Waterproofing', 'Revêtement des Sols', 'Couche de béton autonivellant (1 a 8mm)', 30.000, 'm²', 1500.00, 45000.00, 0, 0, 13),
(132, 4, 'Quincaillerie(s)', 'Electricité', '2 x Prises Etanches 16A', 2.000, 'unité', 1500.00, 3000.00, 0, 0, 14),
(133, 4, 'Quincaillerie(s)', 'Electricité', 'Fils Electriques', 1.000, 'forfait', 10000.00, 10000.00, 0, 0, 15),
(134, 4, 'Quincaillerie(s)', 'Electricité', '4 x Prise 16A', 4.000, 'unité', 800.00, 3200.00, 0, 0, 16),
(135, 4, 'Quincaillerie(s)', 'Electricité', '2 x Prises Doubles', 2.000, 'unité', 900.00, 1800.00, 0, 0, 17),
(136, 4, 'Quincaillerie(s)', 'Electricité', '8 x Lumières Plafond', 8.000, 'unité', 300.00, 2400.00, 0, 0, 18),
(137, 4, 'Carreleur', '2 x Salles de Bain', 'Carreleur', 2.000, 'forfait', 10000.00, 20000.00, 0, 1, 0),
(138, 4, 'Charlie Jacquelin', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Main d\'Oeuvre', 7.000, 'jour', 5000.00, 35000.00, 0, 1, 1),
(139, 4, 'Fournisseur non défini', 'Ameublement', '2 x Lits de 1m90 x 1.35', 2.000, 'unité', 27500.00, 55000.00, 0, 1, 2),
(140, 4, 'Fournisseur non défini', 'Equipements Electro', '2 x Climatiseurs 12000 BTU', 2.000, 'unité', 18000.00, 36000.00, 0, 1, 3),
(141, 4, 'Fournisseur non défini', '2 x Salles de Bain', '2 x Toilettes', 2.000, 'unité', 8000.00, 16000.00, 0, 1, 4),
(142, 4, 'Fournisseur non défini', 'Ameublement', '4 x Tables de Chevet', 4.000, 'unité', 7500.00, 30000.00, 0, 1, 5),
(143, 4, 'Fournisseur non défini', 'Ameublement', '2 x Placards', 2.000, 'unité', 26500.00, 53000.00, 0, 1, 6),
(144, 4, 'Fournisseur non défini', 'Ameublement', '2 Meubles pour les Salles de bain + miroirs', 2.000, 'unité', 7500.00, 15000.00, 0, 1, 7),
(145, 4, 'Fournisseur non défini', '2 x Terrasses et Toits de la Terrasse (2.5m x 2.5m)', 'Toles (Choix de couleur avant la production)', 8.000, 'unité', 3000.00, 24000.00, 0, 1, 8),
(146, 4, 'Fournisseur non défini', '2 x Terrasses et Toits de la Terrasse (2.5m x 2.5m)', 'Decking en composite (Choix de couleur avant la production)', 15.000, 'unité', 3000.00, 45000.00, 0, 1, 9),
(147, 4, 'Fournisseur non défini', '2 x Terrasses et Toits de la Terrasse (2.5m x 2.5m)', 'Structure en Metal', 2.000, 'unité', 60000.00, 120000.00, 0, 1, 10),
(148, 4, 'Fournisseur non défini', '2 x Salles de Bain', 'Plombier', 2.000, 'unité', 2500.00, 5000.00, 0, 1, 11),
(149, 4, 'Fournisseur non défini', '2 x Salles de Bain', '2 x Mitigeurs de douche', 2.000, 'unité', 10000.00, 20000.00, 0, 1, 12),
(150, 4, 'Fournisseur non défini', '2 x Salles de Bain', '2 x Lavabos & Robinets', 2.000, 'unité', 9000.00, 18000.00, 0, 1, 13),
(151, 4, 'Fournisseur non défini', '2 x Salles de Bain', 'Carrelage dans les 2 cabines de douche (Choix du carrelage avant la production selon budget)', 2.000, 'unité', 16000.00, 32000.00, 0, 1, 14),
(152, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Evacuation du surplus de terre et roches', 2.000, 'unité', 4500.00, 9000.00, 0, 1, 15),
(153, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Transport', 2.000, 'unité', 4500.00, 9000.00, 0, 1, 16),
(154, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Macadam', 3.000, 'tonne', 700.00, 2100.00, 0, 1, 17),
(155, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Rocksand', 3.000, 'tonne', 970.00, 2910.00, 0, 1, 18),
(156, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Ciment', 40.000, 'unité', 180.00, 7200.00, 0, 1, 19),
(157, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Main d\'oeuvre', 10.000, 'jour', 7500.00, 75000.00, 0, 1, 20),
(158, 4, 'Fournisseur non défini', 'Fondations Basiques', 'Location d\'un JCB (1 jour)', 2.000, 'jour', 10000.00, 20000.00, 0, 1, 21),
(159, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Ferrailleur', 4.000, 'jour', 2500.00, 10000.00, 0, 1, 22),
(160, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Poutres de support en metal galvanisé', 22.000, 'unité', 1200.00, 26400.00, 0, 1, 23),
(161, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Decking en composite (Choix de couleur avant la production)', 33.000, 'unité', 3000.00, 99000.00, 0, 1, 24),
(162, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Barres Y10', 2.000, 'forfait', 4500.00, 9000.00, 0, 1, 25),
(163, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Transport', 2.000, 'forfait', 4500.00, 9000.00, 0, 1, 26),
(164, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Macadam ½', 2.000, 'tonne', 700.00, 1400.00, 0, 1, 27),
(165, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Rocksand 0.2', 6.000, 'tonne', 970.00, 5820.00, 0, 1, 28),
(166, 4, 'Fournisseur non défini', 'Decking en Bois Composite autour de la Piscine - 33m2', 'Parpaing U 200mm', 100.000, 'unité', 60.00, 6000.00, 0, 1, 29),
(167, 5, 'Dammeuse', 'Compactage de la base', 'Location dammeuse', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 0),
(168, 5, 'Dammeuse', 'Compactage de la base', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 1),
(169, 5, 'Electricien', 'Électricité', 'Électricien', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 2),
(170, 5, 'JCB', 'Fouille', 'Location de JCB', 1.000, 'jour', 10000.00, 10000.00, 0, 0, 3),
(171, 5, 'Maçon', 'Étanchéité Intérieure', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 4),
(172, 5, 'Maçon', 'Montage', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 5),
(173, 5, 'Maçon', 'Fouille', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 6),
(174, 5, 'Maçon', 'Radier', 'Main d\'Oeuvre', 1.000, 'jour', 0.00, 0.00, 0, 0, 7),
(175, 5, 'Maçon', 'Étanchéité Extérieure', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 8),
(176, 5, 'Maçon', 'Site Railing', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 9),
(177, 5, 'Maçon', 'Crépissage Intérieur', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 10),
(178, 5, 'Maçon', 'Coulage', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 11),
(179, 5, 'Maçon', 'Crépissage Extérieur', 'Main d\'oeuvre', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 12),
(180, 5, 'Nabridas', 'Plomberie', 'Skimmer', 1.000, 'unité', 7000.00, 7000.00, 0, 0, 13),
(181, 5, 'Nabridas', 'Plomberie', 'Traversée de parois', 1.000, 'unité', 1300.00, 1300.00, 0, 0, 14),
(182, 5, 'Nabridas', 'Plomberie', 'Buses', 1.000, 'unité', 750.00, 750.00, 0, 0, 15),
(183, 5, 'Nabridas', 'Électricité', 'Boite de connexion electrique', 1.000, 'unité', 350.00, 350.00, 0, 0, 16),
(184, 5, 'Palco Waterproofing', 'Étanchéité Intérieure', 'TAL Sureproof', 1.000, 'kit', 4500.00, 4500.00, 0, 0, 17),
(185, 5, 'Palco Waterproofing', 'Étanchéité Extérieure', 'Pekay Noir', 1.000, 'm²', 350.00, 350.00, 0, 0, 18),
(186, 5, 'Plombier', 'Plomberie', 'Plombier', 1.000, 'jour', 2500.00, 2500.00, 0, 0, 19),
(187, 5, 'Quincaillerie(s)', 'Montage', 'Fer Y12 barres verticales', 1.000, 'barre', 450.00, 450.00, 0, 0, 20),
(188, 5, 'Quincaillerie(s)', 'Étanchéité Intérieure', 'Pinceau (Forfait)', 1.000, 'forfait', 300.00, 300.00, 0, 0, 21),
(189, 5, 'Quincaillerie(s)', 'Montage', 'Fer Y10 barres horizontales', 1.000, 'barre', 300.00, 300.00, 0, 0, 22),
(190, 5, 'Quincaillerie(s)', 'Montage', 'Ciment', 1.000, 'sac', 240.00, 240.00, 0, 0, 23),
(191, 5, 'Quincaillerie(s)', 'Plomberie', 'Tuyaux 50mm Haute Pression', 1.000, 'unité', 850.00, 850.00, 0, 0, 24),
(192, 5, 'Quincaillerie(s)', 'Plomberie', 'Colle PVC (Forfait)', 1.000, 'forfait', 500.00, 500.00, 0, 0, 25),
(193, 5, 'Quincaillerie(s)', 'Site Railing', 'Bois', 1.000, 'planche', 250.00, 250.00, 0, 0, 26),
(194, 5, 'Quincaillerie(s)', 'Électricité', 'Tuyau spot led', 1.000, 'unité', 450.00, 450.00, 0, 0, 27),
(195, 5, 'Quincaillerie(s)', 'Coulage', 'Ciment', 1.000, 'sac', 240.00, 240.00, 0, 0, 28),
(196, 5, 'Quincaillerie(s)', 'Radier', 'Fer Y12 pour base', 1.000, 'barre', 450.00, 450.00, 0, 0, 29),
(197, 5, 'Quincaillerie(s)', 'Radier', 'Fer Y12 pour amorce murs', 1.000, 'barre', 450.00, 450.00, 0, 0, 30),
(198, 5, 'Quincaillerie(s)', 'Étanchéité Extérieure', 'Pinceau (Forfait)', 1.000, 'forfait', 300.00, 300.00, 0, 0, 31),
(199, 5, 'Quincaillerie(s)', 'Électricité', 'Câbles électriques 2.5mm² 3 cors', 1.000, 'mètre', 150.00, 150.00, 0, 0, 32),
(200, 5, 'Quincaillerie(s)', 'Site Railing', 'Clous (Forfait)', 1.000, 'forfait', 500.00, 500.00, 0, 0, 33),
(201, 5, 'Quincaillerie(s)', 'Site Railing', 'Nylon (Forfait)', 1.000, 'forfait', 200.00, 200.00, 0, 0, 34),
(202, 5, 'Quincaillerie(s)', 'Radier', 'Plastique noir', 1.000, 'unité', 500.00, 500.00, 0, 0, 35),
(203, 5, 'Quincaillerie(s)', 'Radier', 'Bois de coffrage', 1.000, 'planche', 250.00, 250.00, 0, 0, 36),
(204, 5, 'Quincaillerie(s)', 'Radier', 'Clous (Forfait)', 1.000, 'forfait', 500.00, 500.00, 0, 0, 37),
(205, 5, 'Quincaillerie(s)', 'Radier', 'Fer d\'attache (Forfait)', 1.000, 'forfait', 300.00, 300.00, 0, 0, 38),
(206, 5, 'Quincaillerie(s)', 'Radier', 'Transport matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 39),
(207, 5, 'Quincaillerie(s)', 'Crépissage Intérieur', 'Colle Ciment', 1.000, 'sac', 350.00, 350.00, 0, 0, 40),
(208, 5, 'Quincaillerie(s)', 'Crépissage Intérieur', 'Latex', 1.000, 'bouteille', 800.00, 800.00, 0, 0, 41),
(209, 5, 'Quincaillerie(s)', 'Crépissage Intérieur', 'Ciment', 1.000, 'sac', 240.00, 240.00, 0, 0, 42),
(210, 5, 'Quincaillerie(s)', 'Crépissage Extérieur', 'Colle Ciment', 1.000, 'sac', 350.00, 350.00, 0, 0, 43),
(211, 5, 'Quincaillerie(s)', 'Crépissage Extérieur', 'Latex', 1.000, 'bouteille', 800.00, 800.00, 0, 0, 44),
(212, 5, 'Quincaillerie(s)', 'Crépissage Extérieur', 'Ciment', 1.000, 'sac', 240.00, 240.00, 0, 0, 45),
(213, 5, 'Toupie Béton G30', 'Coulage', 'Béton', 1.000, 'm³', 5500.00, 5500.00, 0, 0, 46),
(214, 5, 'Toupie Béton G30', 'Coulage', 'Eau Béton', 1.000, 'forfait', 2000.00, 2000.00, 0, 0, 47),
(215, 5, 'Truck', 'Fouille', 'Transport de matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 48),
(216, 5, 'Truck', 'Fouille', 'Transport évacuation de la terre', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 49),
(217, 5, 'Truck', 'Montage', 'Transport matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 50),
(218, 5, 'Truck', 'Plomberie', 'Transport matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 51),
(219, 5, 'Truck', 'Coulage', 'Transport matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 52),
(220, 5, 'Truck', 'Électricité', 'Transport matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 53),
(221, 5, 'Truck', 'Crépissage Intérieur', 'Transport Matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 54),
(222, 5, 'Truck', 'Crépissage Extérieur', 'Transport Matériaux', 1.000, 'unité', 4500.00, 4500.00, 0, 0, 55),
(223, 5, 'United Basalt', 'Montage', 'Bloc BAB', 1.000, 'unité', 50.00, 50.00, 0, 0, 56),
(224, 5, 'United Basalt', 'Montage', 'Rocksand .4', 1.000, 'tonne', 1100.00, 1100.00, 0, 0, 57),
(225, 5, 'United Basalt', 'Coulage', 'Macadam 3/8', 1.000, 'tonne', 1800.00, 1800.00, 0, 0, 58),
(226, 5, 'United Basalt', 'Radier', 'Crusherrun', 1.000, 'tonne', 800.00, 800.00, 0, 0, 59),
(227, 5, 'United Basalt', 'Coulage', 'Rocksand .4', 1.000, 'tonne', 1100.00, 1100.00, 0, 0, 60),
(228, 5, 'United Basalt', 'Crépissage Intérieur', 'Rocksand 0.2', 1.000, 'tonne', 1200.00, 1200.00, 0, 0, 61),
(229, 5, 'United Basalt', 'Crépissage Extérieur', 'Rocksand 0.2', 1.000, 'tonne', 1200.00, 1200.00, 0, 0, 62),
(230, 5, 'Carreleur', 'Carrelage', 'Carreleur', 1.000, 'm²', 1300.00, 1300.00, 0, 1, 0),
(231, 5, 'Carreleur', 'Marches de 60cm de large', 'Carreleur', 1.000, 'm²', 1300.00, 1300.00, 0, 1, 1),
(232, 5, 'Carreleur', 'Banc', 'Carreleur', 1.000, 'm²', 1300.00, 1300.00, 0, 1, 2),
(233, 5, 'Electricien', 'Filtration de Base', 'Électricien', 1.000, 'jour', 2500.00, 2500.00, 0, 1, 3),
(234, 5, 'Maçon', 'Marches de 60cm de large', 'Main d\'oeuvre', 2.000, 'jour', 2500.00, 5000.00, 0, 1, 4),
(235, 5, 'Maçon', 'Banc', 'Main d\'oeuvre', 5.000, 'jour', 2500.00, 12500.00, 0, 1, 5),
(236, 5, 'Nabridas', 'Éclairage', 'Spot Led', 1.000, 'unité', 11000.00, 11000.00, 0, 1, 6),
(237, 5, 'Nabridas', 'Filtration de Base', 'Filtre à Sable', 1.000, 'unité', 18000.00, 18000.00, 0, 1, 7),
(238, 5, 'Nabridas', 'Filtration de Base', 'Pompe de Piscine', 1.000, 'unité', 20000.00, 20000.00, 0, 1, 8),
(239, 5, 'Nabridas', 'Filtration de Base', 'Panneau Electrique', 1.000, 'unité', 9000.00, 9000.00, 0, 1, 9),
(240, 5, 'Plombier', 'Filtration de Base', 'Plombier', 1.000, 'jour', 2500.00, 2500.00, 0, 1, 10),
(241, 5, 'Quality Decors', 'Carrelage', 'Carrelage', 1.000, 'm²', 1700.00, 1700.00, 0, 1, 11),
(242, 5, 'Quality Decors', 'Marches de 60cm de large', 'Carrelage', 1.000, 'm²', 1700.00, 1700.00, 0, 1, 12),
(243, 5, 'Quality Decors', 'Banc', 'Carrelage', 1.000, 'm²', 1700.00, 1700.00, 0, 1, 13),
(244, 5, 'Quincaillerie(s)', 'Marches de 60cm de large', 'Ciment', 10.000, 'sac', 240.00, 2400.00, 0, 1, 14),
(245, 5, 'Quincaillerie(s)', 'Carrelage', 'Colle Carreau', 1.000, 'sac', 450.00, 450.00, 0, 1, 15),
(246, 5, 'Quincaillerie(s)', 'Carrelage', 'Tiles Spacers (Forfait)', 1.000, 'forfait', 200.00, 200.00, 0, 1, 16),
(247, 5, 'Quincaillerie(s)', 'Carrelage', 'Joints', 1.000, 'kg', 250.00, 250.00, 0, 1, 17),
(248, 5, 'Quincaillerie(s)', 'Marches de 60cm de large', 'Colle Carreau', 2.000, 'sac', 450.00, 900.00, 0, 1, 18),
(249, 5, 'Quincaillerie(s)', 'Banc', 'Ciment', 20.000, 'sac', 240.00, 4800.00, 0, 1, 19),
(250, 5, 'Quincaillerie(s)', 'Banc', 'Colle Carreau', 4.000, 'sac', 450.00, 1800.00, 0, 1, 20),
(251, 5, 'Quincaillerie(s)', 'Banc', 'Tiles Spacers (Forfait)', 1.000, 'forfait', 200.00, 200.00, 0, 1, 21),
(252, 5, 'Quincaillerie(s)', 'Banc', 'Joints', 1.000, 'kg', 250.00, 250.00, 0, 1, 22),
(253, 5, 'United Basalt', 'Marches de 60cm de large', 'Bloc BAB', 20.000, 'unité', 50.00, 1000.00, 0, 1, 23),
(254, 5, 'United Basalt', 'Marches de 60cm de large', 'Rocksand 0.2', 2.000, 'tonne', 1200.00, 2400.00, 0, 1, 24),
(255, 5, 'United Basalt', 'Marches de 60cm de large', 'Macadam 3/8', 2.000, 'tonne', 1800.00, 3600.00, 0, 1, 25),
(256, 5, 'United Basalt', 'Banc', 'Bloc BAB', 30.000, 'unité', 50.00, 1500.00, 0, 1, 26),
(257, 5, 'United Basalt', 'Banc', 'Rocksand 0.2', 3.000, 'tonne', 1200.00, 3600.00, 0, 1, 27),
(258, 5, 'United Basalt', 'Banc', 'Macadam 3/8', 3.000, 'tonne', 1800.00, 5400.00, 0, 1, 28);

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
  `contact_id` int DEFAULT NULL,
  `status` enum('draft','open','validated','cancelled','pending','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `valid_until` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `assigned_to` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_free_quote` tinyint(1) DEFAULT '0' COMMENT 'True for free-form quotes created by admin',
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional photo URL for the quote',
  `plan_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional plan/blueprint URL for the quote',
  `margin_percent` decimal(5,2) DEFAULT '30.00' COMMENT 'Margin percentage for free quotes',
  `cloned_from_id` int DEFAULT NULL COMMENT 'Reference to original quote if cloned',
  `quote_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Custom title for free quotes',
  `approval_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Random token used to authenticate client quote-action links'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quotes`
--

INSERT INTO `quotes` (`id`, `reference_number`, `model_id`, `model_name`, `model_type`, `base_price`, `options_total`, `total_price`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `customer_message`, `contact_id`, `status`, `valid_until`, `notes`, `assigned_to`, `created_at`, `updated_at`, `is_free_quote`, `photo_url`, `plan_url`, `margin_percent`, `cloned_from_id`, `quote_title`, `approval_token`) VALUES
(13, 'WPQ-202602-000013', 14, 'Piscine Rectangulaire', 'pool', 498164.00, 354016.00, 852180.27, 'Sanjiv Luckea', 'vmamet@icloud.com', '52544544', 'Pointe aux biches', '', 1, 'approved', '2026-03-19', NULL, NULL, '2026-02-17 16:58:36', '2026-02-21 20:55:40', 0, NULL, NULL, 30.00, NULL, NULL, 'ae6cb0e90f6711f1a77f3cecef590dec'),
(14, 'WPQ-202602-000014', 14, 'Piscine Rectangulaire', 'pool', 490764.00, 354016.00, 844780.02, 'Jean Eric Basraz', 'mrbcreative0987@gmail.com', '57213823', 'Grand Gaube', 'bla bla', 4, 'approved', '2026-03-25', NULL, NULL, '2026-02-23 05:36:58', '2026-02-23 05:37:35', 0, NULL, NULL, 30.00, NULL, NULL, '45bf14e324e3c94767b081b910ca1caf911bb11bf5f3ae8a61ed6736c89c9ef4'),
(17, 'WCQ-202603-000017', 21, 'Sanjiv (Extension avec 2 conteneurs)', 'container', 1718535.00, 1060579.00, 2779114.00, 'Sanjiv Luckea', 'sanjiv.luckhea13@gmail.com', '+44 7847 394321', 'Pointe aux biches', '', 5, 'approved', '2026-03-31', NULL, NULL, '2026-03-01 16:06:06', '2026-03-01 16:07:38', 0, NULL, NULL, 30.00, NULL, NULL, 'f815e9410929c5fc392b023141946a2e7f134e7f407a5918ec8f3d70c4fa7819');

-- --------------------------------------------------------

--
-- Table structure for table `quote_categories`
--

CREATE TABLE `quote_categories` (
  `id` int NOT NULL,
  `quote_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quote_lines`
--

CREATE TABLE `quote_lines` (
  `id` int NOT NULL,
  `category_id` int NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'unité' COMMENT 'Unit of measure (unité, m², m³, kg, etc.)',
  `unit_cost_ht` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Unit cost excluding tax',
  `margin_percent` decimal(5,2) NOT NULL DEFAULT '30.00' COMMENT 'Margin percentage, default 30%',
  `display_order` int DEFAULT '0',
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

--
-- Dumping data for table `quote_options`
--

INSERT INTO `quote_options` (`id`, `quote_id`, `option_id`, `option_name`, `option_price`, `created_at`) VALUES
(12, 13, NULL, 'Carrelage', 131112.00, '2026-02-17 16:58:36'),
(13, 13, NULL, 'Filtration de Base', 77740.00, '2026-02-17 16:58:36'),
(14, 13, NULL, 'Éclairage', 16445.00, '2026-02-17 16:58:36'),
(15, 13, NULL, 'Banc', 92391.00, '2026-02-17 16:58:36'),
(16, 13, NULL, 'Marches de 60cm de large', 36329.00, '2026-02-17 16:58:36'),
(20, 14, NULL, 'Banc', 92391.00, '2026-02-23 05:36:58'),
(21, 14, NULL, 'Marches de 60cm de large', 36329.00, '2026-02-23 05:36:58'),
(22, 14, NULL, 'Carrelage', 131112.00, '2026-02-23 05:36:58'),
(23, 14, NULL, 'Filtration de Base', 77740.00, '2026-02-23 05:36:58'),
(24, 14, NULL, 'Éclairage', 16445.00, '2026-02-23 05:36:58'),
(37, 17, NULL, '2 x Salles de Bain', 144300.00, '2026-03-01 16:06:06'),
(38, 17, NULL, '2 x Terrasses et Toits de la Terrasse (2.5m x 2.5m)', 245700.00, '2026-03-01 16:06:06'),
(39, 17, NULL, 'Ameublement', 198900.00, '2026-03-01 16:06:06'),
(40, 17, NULL, 'Decking en Bois Composite autour de la Piscine - 33m2', 262106.00, '2026-03-01 16:06:06'),
(41, 17, NULL, 'Equipements Electro', 46800.00, '2026-03-01 16:06:06'),
(42, 17, NULL, 'Fondations Basiques', 162773.00, '2026-03-01 16:06:06');

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
(1, 'smtp_host', 'smtp.gmail.com', 'email', 'Serveur SMTP', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(2, 'smtp_port', '465', 'email', 'Port SMTP', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(3, 'smtp_user', 'vmamet@mamba-online.com', 'email', 'Utilisateur SMTP', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(4, 'smtp_password', 'apyv vzpc srcy ozss', 'email', 'Mot de passe SMTP', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(5, 'smtp_secure', 'ssl', 'email', 'Connexion sécurisée', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(6, 'smtp_from', '', 'email', 'Adresse expéditeur', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(7, 'company_name', 'Sunbox Ltd', 'company', 'Nom de l\'entreprise', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(8, 'company_email', '', 'company', 'Email de contact', '2025-12-18 09:43:18', '2026-02-17 18:37:51'),
(9, 'company_phone', '+23054221025', 'company', 'Téléphone', '2025-12-18 09:43:18', '2026-02-17 18:37:51'),
(10, 'company_address', 'Cap Malheureux\nIle Maurice', 'company', 'Adresse', '2025-12-18 09:43:18', '2026-02-17 18:37:51'),
(11, 'admin_email', 'vmamet@sunbox-mauritius.com', 'notifications', 'Email administrateur', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(12, 'send_admin_notifications', 'true', 'notifications', 'Envoyer notifications admin', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(13, 'send_customer_confirmations', 'true', 'notifications', 'Envoyer confirmations client', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(14, 'quote_validity_days', '30', 'general', 'Validité des devis en jours', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(15, 'currency', 'MUR', 'general', 'Devise', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(16, 'currency_symbol', 'Rs', 'general', 'Symbole devise', '2025-12-18 09:43:18', '2026-02-08 07:48:28'),
(17, 'site_title', 'Sunbox Mauritius', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(18, 'meta_keywords', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(19, 'meta_robots', 'index,follow', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(20, 'canonical_url', 'https://sunbox-mauritius.com/', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(21, 'logo_url', '/uploads/site/logo-20251224-040305.jpg', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(22, 'favicon_url', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(23, 'og_title', 'Sunbox Mauritius', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(24, 'og_description', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(25, 'og_image', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(26, 'twitter_image', '', 'seo', NULL, '2025-12-24 04:03:05', '2026-02-08 07:48:28'),
(27, 'site_under_construction', 'true', 'site', NULL, '2025-12-26 02:18:23', '2026-02-22 04:46:12'),
(28, 'under_construction_message', '🚧 Page en construction — merci de revenir ultérieurement. | Page under construction - please come back later', 'site', NULL, '2025-12-26 02:18:23', '2026-02-22 04:46:12'),
(36, 'smtp_from_email', 'vmamet@sunbox-mauritius.com', 'email', NULL, '2025-12-26 02:45:44', '2026-02-08 07:48:28'),
(37, 'smtp_from_name', 'Sunbox Ltd - Container Homes & Swimming-pools', 'email', NULL, '2025-12-26 02:45:44', '2026-02-08 07:48:28'),
(43, 'cc_emails', 'pmamet@sunbox-mauritius.com', 'notifications', NULL, '2025-12-26 02:45:44', '2026-02-08 07:48:28'),
(95, 'site_logo', '/uploads/logo-menu.jpg', 'site', NULL, '2026-01-07 13:21:23', '2026-02-22 04:46:12'),
(96, 'pdf_logo', '/uploads/logo-pdf.jpg', 'site', NULL, '2026-01-07 13:21:23', '2026-02-22 04:46:12'),
(97, 'site_slogan', 'Container home - Swimming-pools', 'site', NULL, '2026-01-07 13:21:23', '2026-02-22 04:46:12'),
(137, 'vat_rate', '15', 'site', NULL, '2026-02-08 05:42:00', '2026-02-22 04:46:12'),
(255, 'dev_mode_no_password', 'true', 'site', NULL, '2026-02-12 06:53:11', '2026-02-22 04:46:12'),
(263, 'payment_terms', 'On Order', 'site', NULL, '2026-02-17 18:37:51', '2026-02-17 18:37:51'),
(264, 'bank_account', '111', 'site', NULL, '2026-02-17 18:37:51', '2026-02-17 18:37:51'),
(268, 'admin_notification_email', 'vmamet@sunbox-mauritius.com', 'site', NULL, '2026-02-17 18:37:51', '2026-02-17 18:37:51'),
(269, 'pdf_primary_color', '#1A365D', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(270, 'pdf_accent_color', '#c78800', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(271, 'pdf_footer_text', 'Sunbox Ltd – Grand Baie, Mauritius | info@sunbox-mauritius.com', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(272, 'pdf_terms', 'Ce devis est valable pour la durée indiquée. Les prix sont en MUR et hors TVA sauf mention contraire. Paiement selon conditions convenues.', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(273, 'pdf_bank_details', 'Banque : The Mauritius Commercial Bank Ltd.\nCompte : 000454842899\nTitulaire : Sunbox Ltd.', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(274, 'pdf_validity_days', '30', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(275, 'pdf_show_logo', 'true', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(276, 'pdf_show_vat', 'true', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(277, 'pdf_show_bank_details', 'true', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(278, 'pdf_show_terms', 'true', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(279, 'pdf_template', '3', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(280, 'pdf_font', 'inter', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(281, 'pdf_logo_position', 'left', 'pdf', NULL, '2026-02-21 20:58:05', '2026-03-01 16:12:27'),
(302, 'pdf_logo_offset_left', '14', 'pdf', NULL, '2026-02-24 13:57:41', '2026-03-01 16:12:27'),
(303, 'pdf_logo_offset_right', '0', 'pdf', NULL, '2026-02-24 13:57:41', '2026-03-01 16:12:27'),
(304, 'pdf_logo_offset_top', '0', 'pdf', NULL, '2026-02-24 13:57:41', '2026-03-01 16:12:27'),
(305, 'pdf_logo_offset_bottom', '0', 'pdf', NULL, '2026-02-24 13:57:41', '2026-03-01 16:12:27');

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
  `replace_with_sunbox` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `city`, `phone`, `email`, `is_active`, `replace_with_sunbox`, `created_at`, `updated_at`) VALUES
(1, 'Quincaillerie Tigode', 'Cote D\'Or', '+230 123 4567', 'contact@fournisseur.mu', 1, 0, '2026-02-05 09:06:53', '2026-02-05 13:07:05'),
(2, 'Charlie Jacquelin', 'Port Louis', '+230 234 5678', 'info@abc-construction.mu', 1, 0, '2026-02-05 09:06:53', '2026-02-05 09:08:13'),
(3, 'Owen Antoine', 'Grand Gaube', '+230 345 6789', 'elec@plus.mu', 1, 0, '2026-02-05 09:06:53', '2026-02-05 09:08:40'),
(4, 'Jean Eric Basraz', 'Grand Gaube', '+230 456 7890', 'contact@plomberiepro.mu', 1, 0, '2026-02-05 09:06:53', '2026-02-05 09:09:52'),
(5, 'Medlog', 'Riche Terre', '', '', 1, 1, '2026-02-05 09:10:05', '2026-03-02 11:05:21'),
(6, 'Quincaillerie(s)', '', '', '', 1, 0, '2026-02-16 04:48:16', '2026-02-16 04:48:16'),
(7, 'Maçon', '', '', '', 1, 0, '2026-02-17 03:51:30', '2026-02-17 03:51:30'),
(8, 'Electricien', '', '', '', 1, 0, '2026-02-17 03:51:45', '2026-02-17 03:51:45'),
(9, 'Plombier', '', '', '', 1, 0, '2026-02-17 03:51:52', '2026-02-17 03:51:52'),
(10, 'Carreleur', '', '', '', 1, 0, '2026-02-17 03:51:59', '2026-03-02 10:48:59'),
(11, 'Quality Decors', '', '', '', 1, 0, '2026-02-17 03:52:16', '2026-02-17 03:52:16'),
(12, 'Palco Waterproofing', '', '', '', 1, 0, '2026-02-17 03:52:32', '2026-02-17 03:52:32'),
(13, 'Truck', '', '', '', 1, 0, '2026-02-17 03:52:59', '2026-02-17 03:52:59'),
(14, 'JCB', '', '', '', 1, 0, '2026-02-17 03:53:06', '2026-02-17 03:53:06'),
(15, 'Dammeuse', '', '', '', 1, 0, '2026-02-17 03:53:17', '2026-02-17 03:53:17'),
(16, 'United Basalt', '', '', '', 1, 0, '2026-02-17 03:57:27', '2026-02-17 03:57:27'),
(17, 'Toupie Béton G30', '', '', '', 1, 0, '2026-02-17 04:13:06', '2026-02-17 04:13:06'),
(18, 'Nabridas', '', '', '', 1, 0, '2026-02-17 04:41:03', '2026-02-17 04:41:03'),
(19, 'Sunbox', '', '', '', 1, 0, '2026-02-17 04:48:01', '2026-02-17 04:48:01'),
(20, 'Fabriquant Aluminium', '', '', '', 1, 1, '2026-03-02 07:53:42', '2026-03-02 13:44:07');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','manager','sales','professional') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sales',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin@sunbox-mauritius.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrateur', 'admin', 1, NULL, '2025-12-18 09:43:18', '2025-12-18 09:43:18'),
(2, 'vincent@mamet.email', '$2y$10$rnLZJM9c21D666VaXiMb2uXhpXPj2wFYMtC/LW1Dr4D8byob7YUpC', 'Jean Eric Basraz', 'professional', 1, NULL, '2026-02-25 18:54:35', '2026-03-02 13:37:19');

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
,`status` enum('draft','open','validated','cancelled','pending','approved','rejected','completed')
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

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_quote_category_totals`
-- (See below for the actual view)
--
CREATE TABLE `v_quote_category_totals` (
`category_id` int
,`quote_id` int
,`category_name` varchar(255)
,`display_order` int
,`total_cost_ht` decimal(43,2)
,`total_sale_price_ht` decimal(47,2)
,`total_profit_ht` decimal(48,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_quote_lines_with_calculations`
-- (See below for the actual view)
--
CREATE TABLE `v_quote_lines_with_calculations` (
`id` int
,`category_id` int
,`description` varchar(500)
,`quantity` decimal(12,4)
,`unit` varchar(50)
,`unit_cost_ht` decimal(12,2)
,`margin_percent` decimal(5,2)
,`display_order` int
,`created_at` timestamp
,`updated_at` timestamp
,`category_name` varchar(255)
,`quote_id` int
,`total_cost_ht` decimal(21,2)
,`sale_price_ht` decimal(25,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_quote_totals`
-- (See below for the actual view)
--
CREATE TABLE `v_quote_totals` (
`quote_id` int
,`calculated_total_price` decimal(65,2)
,`total_cost` decimal(65,2)
,`total_profit` decimal(65,2)
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
  ADD KEY `fk_boq_categories_image` (`image_id`),
  ADD KEY `fk_boq_categories_parent` (`parent_id`);

--
-- Indexes for table `boq_lines`
--
ALTER TABLE `boq_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_display_order` (`display_order`),
  ADD KEY `fk_boq_lines_price_list` (`price_list_id`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_contacts_device_id` (`device_id`);

--
-- Indexes for table `db_schema_version`
--
ALTER TABLE `db_schema_version`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `development_ideas`
--
ALTER TABLE `development_ideas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_statut` (`statut`),
  ADD KEY `idx_urgence` (`urgence`),
  ADD KEY `idx_importance` (`importance`),
  ADD KEY `idx_priority` (`priority_order`);

--
-- Indexes for table `discounts`
--
ALTER TABLE `discounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `discount_models`
--
ALTER TABLE `discount_models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_discount_model` (`discount_id`,`model_id`),
  ADD KEY `idx_discount_models_discount` (`discount_id`),
  ADD KEY `idx_discount_models_model` (`model_id`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recipient` (`recipient_email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_template_key` (`template_key`);

--
-- Indexes for table `email_signatures`
--
ALTER TABLE `email_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `signature_key` (`signature_key`),
  ADD KEY `idx_key` (`signature_key`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_default` (`is_default`);

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_key` (`template_key`),
  ADD KEY `idx_key` (`template_key`),
  ADD KEY `idx_type` (`template_type`),
  ADD KEY `idx_active` (`is_active`);

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
-- Indexes for table `pdf_templates`
--
ALTER TABLE `pdf_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document_type` (`document_type`),
  ADD KEY `idx_is_default` (`is_default`);

--
-- Indexes for table `pool_boq_price_list`
--
ALTER TABLE `pool_boq_price_list`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_display_order` (`display_order`);

--
-- Indexes for table `pool_boq_templates`
--
ALTER TABLE `pool_boq_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_is_default` (`is_default`);

--
-- Indexes for table `pool_boq_variables`
--
ALTER TABLE `pool_boq_variables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_display_order` (`display_order`);

--
-- Indexes for table `professional_credit_transactions`
--
ALTER TABLE `professional_credit_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `professional_model_requests`
--
ALTER TABLE `professional_model_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `professional_packs`
--
ALTER TABLE `professional_packs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `professional_profiles`
--
ALTER TABLE `professional_profiles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_pp_api_token` (`api_token`),
  ADD KEY `idx_pp_domain` (`domain`);

--
-- Indexes for table `pro_model_overrides`
--
ALTER TABLE `pro_model_overrides`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_model` (`user_id`,`model_id`);

--
-- Indexes for table `purchase_reports`
--
ALTER TABLE `purchase_reports`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `purchase_report_items`
--
ALTER TABLE `purchase_report_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_id` (`report_id`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD UNIQUE KEY `idx_quotes_approval_token` (`approval_token`),
  ADD KEY `idx_reference` (`reference_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_customer_email` (`customer_email`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `assigned_to` (`assigned_to`),
  ADD KEY `idx_quotes_contact_id` (`contact_id`),
  ADD KEY `idx_cloned_from` (`cloned_from_id`),
  ADD KEY `idx_is_free_quote` (`is_free_quote`);

--
-- Indexes for table `quote_categories`
--
ALTER TABLE `quote_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quote_id` (`quote_id`),
  ADD KEY `idx_display_order` (`display_order`);

--
-- Indexes for table `quote_lines`
--
ALTER TABLE `quote_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_display_order` (`display_order`);

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=209;

--
-- AUTO_INCREMENT for table `boq_lines`
--
ALTER TABLE `boq_lines`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=772;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `development_ideas`
--
ALTER TABLE `development_ideas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `discounts`
--
ALTER TABLE `discounts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `discount_models`
--
ALTER TABLE `discount_models`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `email_signatures`
--
ALTER TABLE `email_signatures`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `email_templates`
--
ALTER TABLE `email_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `models`
--
ALTER TABLE `models`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `model_images`
--
ALTER TABLE `model_images`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

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
-- AUTO_INCREMENT for table `pdf_templates`
--
ALTER TABLE `pdf_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pool_boq_price_list`
--
ALTER TABLE `pool_boq_price_list`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- AUTO_INCREMENT for table `pool_boq_templates`
--
ALTER TABLE `pool_boq_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pool_boq_variables`
--
ALTER TABLE `pool_boq_variables`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `professional_credit_transactions`
--
ALTER TABLE `professional_credit_transactions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `professional_model_requests`
--
ALTER TABLE `professional_model_requests`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `professional_packs`
--
ALTER TABLE `professional_packs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `professional_profiles`
--
ALTER TABLE `professional_profiles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pro_model_overrides`
--
ALTER TABLE `pro_model_overrides`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `purchase_reports`
--
ALTER TABLE `purchase_reports`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `purchase_report_items`
--
ALTER TABLE `purchase_report_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=259;

--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `quote_categories`
--
ALTER TABLE `quote_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `quote_lines`
--
ALTER TABLE `quote_lines`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `quote_options`
--
ALTER TABLE `quote_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=425;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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

-- --------------------------------------------------------

--
-- Structure for view `v_quote_category_totals`
--
DROP TABLE IF EXISTS `v_quote_category_totals`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_quote_category_totals`  AS SELECT `qc`.`id` AS `category_id`, `qc`.`quote_id` AS `quote_id`, `qc`.`name` AS `category_name`, `qc`.`display_order` AS `display_order`, coalesce(sum(round((`ql`.`quantity` * `ql`.`unit_cost_ht`),2)),0) AS `total_cost_ht`, coalesce(sum(round(((`ql`.`quantity` * `ql`.`unit_cost_ht`) * (1 + (`ql`.`margin_percent` / 100))),2)),0) AS `total_sale_price_ht`, (coalesce(sum(round(((`ql`.`quantity` * `ql`.`unit_cost_ht`) * (1 + (`ql`.`margin_percent` / 100))),2)),0) - coalesce(sum(round((`ql`.`quantity` * `ql`.`unit_cost_ht`),2)),0)) AS `total_profit_ht` FROM (`quote_categories` `qc` left join `quote_lines` `ql` on((`qc`.`id` = `ql`.`category_id`))) GROUP BY `qc`.`id`, `qc`.`quote_id`, `qc`.`name`, `qc`.`display_order` ORDER BY `qc`.`display_order` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_quote_lines_with_calculations`
--
DROP TABLE IF EXISTS `v_quote_lines_with_calculations`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_quote_lines_with_calculations`  AS SELECT `ql`.`id` AS `id`, `ql`.`category_id` AS `category_id`, `ql`.`description` AS `description`, `ql`.`quantity` AS `quantity`, `ql`.`unit` AS `unit`, `ql`.`unit_cost_ht` AS `unit_cost_ht`, `ql`.`margin_percent` AS `margin_percent`, `ql`.`display_order` AS `display_order`, `ql`.`created_at` AS `created_at`, `ql`.`updated_at` AS `updated_at`, `qc`.`name` AS `category_name`, `qc`.`quote_id` AS `quote_id`, round((`ql`.`quantity` * `ql`.`unit_cost_ht`),2) AS `total_cost_ht`, round(((`ql`.`quantity` * `ql`.`unit_cost_ht`) * (1 + (`ql`.`margin_percent` / 100))),2) AS `sale_price_ht` FROM (`quote_lines` `ql` join `quote_categories` `qc` on((`ql`.`category_id` = `qc`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_quote_totals`
--
DROP TABLE IF EXISTS `v_quote_totals`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mauriti2`@`localhost` SQL SECURITY DEFINER VIEW `v_quote_totals`  AS SELECT `v_quote_category_totals`.`quote_id` AS `quote_id`, sum(`v_quote_category_totals`.`total_sale_price_ht`) AS `calculated_total_price`, sum(`v_quote_category_totals`.`total_cost_ht`) AS `total_cost`, sum(`v_quote_category_totals`.`total_profit_ht`) AS `total_profit` FROM `v_quote_category_totals` GROUP BY `v_quote_category_totals`.`quote_id` ;

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
  ADD CONSTRAINT `fk_boq_categories_image` FOREIGN KEY (`image_id`) REFERENCES `model_images` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_boq_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `boq_categories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `boq_lines`
--
ALTER TABLE `boq_lines`
  ADD CONSTRAINT `boq_lines_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `boq_categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `boq_lines_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_boq_lines_price_list` FOREIGN KEY (`price_list_id`) REFERENCES `pool_boq_price_list` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `discount_models`
--
ALTER TABLE `discount_models`
  ADD CONSTRAINT `fk_dm_discount` FOREIGN KEY (`discount_id`) REFERENCES `discounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dm_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `pool_boq_price_list`
--
ALTER TABLE `pool_boq_price_list`
  ADD CONSTRAINT `pool_boq_price_list_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `professional_credit_transactions`
--
ALTER TABLE `professional_credit_transactions`
  ADD CONSTRAINT `professional_credit_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `professional_model_requests`
--
ALTER TABLE `professional_model_requests`
  ADD CONSTRAINT `professional_model_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `professional_packs`
--
ALTER TABLE `professional_packs`
  ADD CONSTRAINT `professional_packs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `professional_profiles`
--
ALTER TABLE `professional_profiles`
  ADD CONSTRAINT `professional_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pro_model_overrides`
--
ALTER TABLE `pro_model_overrides`
  ADD CONSTRAINT `pro_model_overrides_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_report_items`
--
ALTER TABLE `purchase_report_items`
  ADD CONSTRAINT `purchase_report_items_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `purchase_reports` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `fk_quotes_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `quote_categories`
--
ALTER TABLE `quote_categories`
  ADD CONSTRAINT `quote_categories_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quote_lines`
--
ALTER TABLE `quote_lines`
  ADD CONSTRAINT `quote_lines_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `quote_categories` (`id`) ON DELETE CASCADE;

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
