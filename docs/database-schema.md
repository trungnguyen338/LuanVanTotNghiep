-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jun 10, 2026 at 05:20 AM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `duanxaydung`
--

-- --------------------------------------------------------

--
-- Table structure for table `addendum_documents`
--

DROP TABLE IF EXISTS `addendum_documents`;
CREATE TABLE IF NOT EXISTS `addendum_documents` (
  `addendum_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`addendum_id`,`document_id`),
  KEY `fk_ad_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_contracts`
--

DROP TABLE IF EXISTS `client_contracts`;
CREATE TABLE IF NOT EXISTS `client_contracts` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `contract_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `signed_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','COMPLETED','TERMINATED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_code` (`contract_code`),
  KEY `client_contracts_project_id_foreign` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_contract_documents`
--

DROP TABLE IF EXISTS `client_contract_documents`;
CREATE TABLE IF NOT EXISTS `client_contract_documents` (
  `client_contract_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`client_contract_id`,`document_id`),
  KEY `fk_ccd_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `construction_logs`
--

DROP TABLE IF EXISTS `construction_logs`;
CREATE TABLE IF NOT EXISTS `construction_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_detail_id` bigint UNSIGNED NOT NULL,
  `daily_volume` decimal(15,2) DEFAULT '0.00' COMMENT 'Khối lượng làm được trong ngày',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `weather` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_log_task_detail` (`task_detail_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `construction_log_images`
--

DROP TABLE IF EXISTS `construction_log_images`;
CREATE TABLE IF NOT EXISTS `construction_log_images` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `construction_log_id` bigint UNSIGNED NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `construction_log_images_construction_log_id_foreign` (`construction_log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contract_addendums`
--

DROP TABLE IF EXISTS `contract_addendums`;
CREATE TABLE IF NOT EXISTS `contract_addendums` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_contract_id` bigint UNSIGNED DEFAULT NULL,
  `sub_contract_id` bigint UNSIGNED DEFAULT NULL,
  `addendum_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_adjustment` decimal(15,2) NOT NULL DEFAULT '0.00',
  `extended_end_date` date DEFAULT NULL,
  `signed_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','REJECTED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_addendum_client` (`client_contract_id`),
  KEY `fk_addendum_sub` (`sub_contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contract_items`
--

DROP TABLE IF EXISTS `contract_items`;
CREATE TABLE IF NOT EXISTS `contract_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_contract_id` bigint UNSIGNED NOT NULL,
  `item_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contract_items_client_contract_id_foreign` (`client_contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
CREATE TABLE IF NOT EXISTS `customers` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `customer_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_customer_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `detail_contract_contractor`
--

DROP TABLE IF EXISTS `detail_contract_contractor`;
CREATE TABLE IF NOT EXISTS `detail_contract_contractor` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `sub_contract_id` bigint UNSIGNED NOT NULL,
  `subcontractor_id` bigint UNSIGNED NOT NULL,
  `role_in_contract` enum('MAIN','MEMBER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MAIN',
  `share_percentage` decimal(5,2) NOT NULL DEFAULT '100.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_contract_contractor` (`sub_contract_id`,`subcontractor_id`),
  KEY `fk_detail_subcontractor` (`subcontractor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
CREATE TABLE IF NOT EXISTS `document_types` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `type_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_contracts`
--

DROP TABLE IF EXISTS `material_contracts`;
CREATE TABLE IF NOT EXISTS `material_contracts` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `supplier_id` bigint UNSIGNED NOT NULL,
  `contract_code` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `signed_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_code` (`contract_code`),
  KEY `material_contracts_project_id_foreign` (`project_id`),
  KEY `material_contracts_supplier_id_foreign` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_contract_documents`
--

DROP TABLE IF EXISTS `material_contract_documents`;
CREATE TABLE IF NOT EXISTS `material_contract_documents` (
  `material_contract_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`material_contract_id`,`document_id`),
  KEY `fk_mcd_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `material_contract_items`
--

DROP TABLE IF EXISTS `material_contract_items`;
CREATE TABLE IF NOT EXISTS `material_contract_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `material_contract_id` bigint UNSIGNED NOT NULL,
  `material_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `unit_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mci_contract` (`material_contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_documents`
--

DROP TABLE IF EXISTS `payment_documents`;
CREATE TABLE IF NOT EXISTS `payment_documents` (
  `payment_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`payment_id`,`document_id`),
  KEY `fk_pd_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_project_tasks`
--

DROP TABLE IF EXISTS `payment_project_tasks`;
CREATE TABLE IF NOT EXISTS `payment_project_tasks` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_id` bigint UNSIGNED NOT NULL COMMENT 'ID của Phiếu thu',
  `project_task_id` bigint UNSIGNED NOT NULL COMMENT 'ID của Hạng mục cha',
  `paid_amount` decimal(15,2) NOT NULL COMMENT 'Số tiền thu được đợt này',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ppt_payment` (`payment_id`),
  KEY `fk_ppt_project_task` (`project_task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_task_details`
--

DROP TABLE IF EXISTS `payment_task_details`;
CREATE TABLE IF NOT EXISTS `payment_task_details` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_id` bigint UNSIGNED NOT NULL COMMENT 'ID của Phiếu chi',
  `task_detail_id` bigint UNSIGNED NOT NULL COMMENT 'ID của Công việc con',
  `paid_amount` decimal(15,2) NOT NULL COMMENT 'Số tiền giải ngân đợt này',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ptd_payment` (`payment_id`),
  KEY `fk_ptd_task_detail` (`task_detail_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
CREATE TABLE IF NOT EXISTS `projects` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `supervisor_id` bigint UNSIGNED NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date DEFAULT NULL,
  `status` enum('DRAFT','PENDING','PROCESSING','REVISION','COMPLETED','ON_HOLD') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expected_end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`),
  KEY `projects_category_id_foreign` (`category_id`),
  KEY `projects_customer_id_foreign` (`customer_id`),
  KEY `projects_supervisor_id_foreign` (`supervisor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_categories`
--

DROP TABLE IF EXISTS `project_categories`;
CREATE TABLE IF NOT EXISTS `project_categories` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_documents`
--

DROP TABLE IF EXISTS `project_documents`;
CREATE TABLE IF NOT EXISTS `project_documents` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `document_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type_id` bigint UNSIGNED NOT NULL,
  `file_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('DRAFT','PENDING','PROCESSING','REVISION','COMPLETED','REJECTED','CANCELLED','ARCHIVED','ACTIVE','TERMINATED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',
  `uploaded_by` bigint UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_documents_project_id_foreign` (`project_id`),
  KEY `project_documents_document_type_id_foreign` (`document_type_id`),
  KEY `fk_document_uploader` (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_payments`
--

DROP TABLE IF EXISTS `project_payments`;
CREATE TABLE IF NOT EXISTS `project_payments` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_type` enum('REVENUE','COST') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_contract_id` bigint UNSIGNED DEFAULT NULL,
  `sub_contract_id` bigint UNSIGNED DEFAULT NULL,
  `material_contract_id` bigint UNSIGNED DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_date` date DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_payments_client_contract_id_foreign` (`client_contract_id`),
  KEY `project_payments_sub_contract_id_foreign` (`sub_contract_id`),
  KEY `project_payments_material_contract_id_foreign` (`material_contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project_tasks`
--

DROP TABLE IF EXISTS `project_tasks`;
CREATE TABLE IF NOT EXISTS `project_tasks` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `contract_item_id` bigint UNSIGNED DEFAULT NULL,
  `task_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_type` enum('TECHNICAL','CONSTRUCTION') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CONSTRUCTION',
  `work_volume` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('TODO','DOING','DONE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TODO',
  `acceptance_status` enum('NONE','PENDING','APPROVED','REJECTED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  `rejection_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `billing_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `progress_percent` tinyint NOT NULL DEFAULT '0',
  `completed_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `project_tasks_project_id_foreign` (`project_id`),
  KEY `project_tasks_contract_item_id_foreign` (`contract_item_id`),
  KEY `fk_projecttasks_approved_by` (`approved_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `level` int NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcontractors`
--

DROP TABLE IF EXISTS `subcontractors`;
CREATE TABLE IF NOT EXISTS `subcontractors` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `subcontractor_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','SUSPENDED','PENDING') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subcontractor_code` (`subcontractor_code`),
  KEY `subcontractors_user_id_foreign` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sub_contracts`
--

DROP TABLE IF EXISTS `sub_contracts`;
CREATE TABLE IF NOT EXISTS `sub_contracts` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `contract_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `signed_date` date DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','COMPLETED','TERMINATED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_code` (`contract_code`),
  KEY `sub_contracts_project_id_foreign` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sub_contract_documents`
--

DROP TABLE IF EXISTS `sub_contract_documents`;
CREATE TABLE IF NOT EXISTS `sub_contract_documents` (
  `sub_contract_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`sub_contract_id`,`document_id`),
  KEY `fk_scd_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_code` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_audit_logs`
--

DROP TABLE IF EXISTS `system_audit_logs`;
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `module` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` bigint UNSIGNED DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `system_audit_logs_user_id_foreign` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_details`
--

DROP TABLE IF EXISTS `task_details`;
CREATE TABLE IF NOT EXISTS `task_details` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_task_id` bigint UNSIGNED NOT NULL,
  `contractor_detail_id` bigint UNSIGNED NOT NULL,
  `detail_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_volume` decimal(15,2) NOT NULL DEFAULT '0.00',
  `agreed_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `progress_percent` tinyint NOT NULL DEFAULT '0',
  `status` enum('TODO','DOING','DONE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TODO',
  `acceptance_status` enum('NONE','PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  `rejection_note` text COLLATE utf8mb4_unicode_ci,
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_taskdetails_projecttask` (`project_task_id`),
  KEY `fk_taskdetails_contractordetail` (`contractor_detail_id`),
  KEY `fk_taskdetails_approved_by` (`approved_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_documents`
--

DROP TABLE IF EXISTS `task_documents`;
CREATE TABLE IF NOT EXISTS `task_documents` (
  `task_id` bigint UNSIGNED NOT NULL,
  `document_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`task_id`,`document_id`),
  KEY `fk_td_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_material_usage`
--

DROP TABLE IF EXISTS `task_material_usage`;
CREATE TABLE IF NOT EXISTS `task_material_usage` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_task_id` bigint UNSIGNED NOT NULL,
  `material_item_id` bigint UNSIGNED NOT NULL,
  `quantity_used` decimal(15,2) NOT NULL,
  `usage_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tmu_task` (`project_task_id`),
  KEY `fk_tmu_material` (`material_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `users_role_id_foreign` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addendum_documents`
--
ALTER TABLE `addendum_documents`
  ADD CONSTRAINT `fk_ad_addendum` FOREIGN KEY (`addendum_id`) REFERENCES `contract_addendums` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ad_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `client_contracts`
--
ALTER TABLE `client_contracts`
  ADD CONSTRAINT `client_contracts_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `client_contract_documents`
--
ALTER TABLE `client_contract_documents`
  ADD CONSTRAINT `fk_ccd_contract` FOREIGN KEY (`client_contract_id`) REFERENCES `client_contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ccd_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `construction_logs`
--
ALTER TABLE `construction_logs`
  ADD CONSTRAINT `fk_log_task_detail` FOREIGN KEY (`task_detail_id`) REFERENCES `task_details` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `construction_log_images`
--
ALTER TABLE `construction_log_images`
  ADD CONSTRAINT `construction_log_images_construction_log_id_foreign` FOREIGN KEY (`construction_log_id`) REFERENCES `construction_logs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contract_addendums`
--
ALTER TABLE `contract_addendums`
  ADD CONSTRAINT `fk_addendum_client` FOREIGN KEY (`client_contract_id`) REFERENCES `client_contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_addendum_sub` FOREIGN KEY (`sub_contract_id`) REFERENCES `sub_contracts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contract_items`
--
ALTER TABLE `contract_items`
  ADD CONSTRAINT `contract_items_client_contract_id_foreign` FOREIGN KEY (`client_contract_id`) REFERENCES `client_contracts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `detail_contract_contractor`
--
ALTER TABLE `detail_contract_contractor`
  ADD CONSTRAINT `fk_detail_subcontract` FOREIGN KEY (`sub_contract_id`) REFERENCES `sub_contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_detail_subcontractor` FOREIGN KEY (`subcontractor_id`) REFERENCES `subcontractors` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `material_contracts`
--
ALTER TABLE `material_contracts`
  ADD CONSTRAINT `material_contracts_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `material_contracts_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `material_contract_documents`
--
ALTER TABLE `material_contract_documents`
  ADD CONSTRAINT `fk_mcd_contract` FOREIGN KEY (`material_contract_id`) REFERENCES `material_contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mcd_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `material_contract_items`
--
ALTER TABLE `material_contract_items`
  ADD CONSTRAINT `fk_mci_contract` FOREIGN KEY (`material_contract_id`) REFERENCES `material_contracts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_documents`
--
ALTER TABLE `payment_documents`
  ADD CONSTRAINT `fk_pd_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pd_payment` FOREIGN KEY (`payment_id`) REFERENCES `project_payments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_project_tasks`
--
ALTER TABLE `payment_project_tasks`
  ADD CONSTRAINT `fk_ppt_payment` FOREIGN KEY (`payment_id`) REFERENCES `project_payments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ppt_project_task` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `payment_task_details`
--
ALTER TABLE `payment_task_details`
  ADD CONSTRAINT `fk_ptd_payment` FOREIGN KEY (`payment_id`) REFERENCES `project_payments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ptd_task_detail` FOREIGN KEY (`task_detail_id`) REFERENCES `task_details` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `project_categories` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `projects_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `projects_supervisor_id_foreign` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `project_documents`
--
ALTER TABLE `project_documents`
  ADD CONSTRAINT `fk_document_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `project_documents_document_type_id_foreign` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `project_documents_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `project_payments`
--
ALTER TABLE `project_payments`
  ADD CONSTRAINT `project_payments_client_contract_id_foreign` FOREIGN KEY (`client_contract_id`) REFERENCES `client_contracts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `project_payments_material_contract_id_foreign` FOREIGN KEY (`material_contract_id`) REFERENCES `material_contracts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `project_payments_sub_contract_id_foreign` FOREIGN KEY (`sub_contract_id`) REFERENCES `sub_contracts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `project_tasks`
--
ALTER TABLE `project_tasks`
  ADD CONSTRAINT `fk_projecttasks_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `project_tasks_contract_item_id_foreign` FOREIGN KEY (`contract_item_id`) REFERENCES `contract_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `project_tasks_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subcontractors`
--
ALTER TABLE `subcontractors`
  ADD CONSTRAINT `subcontractors_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sub_contracts`
--
ALTER TABLE `sub_contracts`
  ADD CONSTRAINT `sub_contracts_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sub_contract_documents`
--
ALTER TABLE `sub_contract_documents`
  ADD CONSTRAINT `fk_scd_contract` FOREIGN KEY (`sub_contract_id`) REFERENCES `sub_contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_scd_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_audit_logs`
--
ALTER TABLE `system_audit_logs`
  ADD CONSTRAINT `system_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_details`
--
ALTER TABLE `task_details`
  ADD CONSTRAINT `fk_taskdetails_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_taskdetails_contractordetail` FOREIGN KEY (`contractor_detail_id`) REFERENCES `detail_contract_contractor` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_taskdetails_projecttask` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_documents`
--
ALTER TABLE `task_documents`
  ADD CONSTRAINT `fk_td_document` FOREIGN KEY (`document_id`) REFERENCES `project_documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_td_task` FOREIGN KEY (`task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_material_usage`
--
ALTER TABLE `task_material_usage`
  ADD CONSTRAINT `fk_tmu_material` FOREIGN KEY (`material_item_id`) REFERENCES `material_contract_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tmu_task` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
