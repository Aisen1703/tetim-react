<?php
namespace Tetim\Controllers;

use Tetim\Models\Product;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProductController extends BaseController
{
    private $productModel;

    public function __construct()
    {
        parent::__construct();
        $this->productModel = new Product($this->db);
    }

    public function getPublicProducts()
    {
        $products = $this->productModel->getAllPublished();
        $this->sendSuccess(['products' => $products]);
    }

    public function adminGetProducts()
    {
        $this->requireAdmin();
        $products = $this->productModel->getAll();
        $this->sendSuccess(['products' => $products]);
    }

    public function adminCreateProduct()
    {
        $this->requireAdmin();
        $data = $this->getJsonInput();
        if (empty($data['name']) || !isset($data['price'])) {
            $this->sendError('Название и цена обязательны', 400);
        }
        $id = $this->productModel->create($data);
        $this->sendSuccess(['product' => $this->productModel->find($id)]);
    }

    public function adminUpdateProduct($id)
    {
        $this->requireAdmin();
        $data = $this->getJsonInput();
        $this->productModel->update($id, $data);
        $this->sendSuccess(['message' => 'Товар обновлён']);
    }

    public function adminDeleteProduct($id)
    {
        $this->requireAdmin();
        $this->productModel->delete($id);
        $this->sendSuccess(['message' => 'Товар удалён']);
    }

    public function adminPublishProduct($id)
    {
        $this->requireAdmin();
        $this->productModel->setPublished($id, true);
        $this->sendSuccess(['message' => 'Опубликован']);
    }

    public function adminUnpublishProduct($id)
    {
        $this->requireAdmin();
        $this->productModel->setPublished($id, false);
        $this->sendSuccess(['message' => 'Снят с публикации']);
    }

    public function adminImportProducts()
    {
        $this->requireAdmin();
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $this->sendError('Файл не загружен', 400);
        }
        $tmpPath = $_FILES['file']['tmp_name'];
        $spreadsheet = IOFactory::load($tmpPath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();
        $created = 0;
        $updated = 0;
        $skipped = 0;
        foreach ($rows as $index => $row) {
            if ($index === 0) continue; // заголовок
            if (empty($row[0]) && empty($row[1])) continue;
            $productData = [
                'external_id' => $row[0] ?? null,
                'article' => $row[1] ?? null,
                'name' => $row[2] ?? '',
                'category' => $row[3] ?? 'accessories',
                'price' => floatval($row[4] ?? 0),
                'sizes' => $row[5] ?? '',
                'stock' => intval($row[6] ?? 0),
                'image_url' => $row[7] ?? null,
                'description' => $row[8] ?? null,
                'is_published' => 1
            ];
            if (empty($productData['name'])) {
                $skipped++;
                continue;
            }
            $existing = null;
            if ($productData['external_id']) {
                $stmt = $this->db->prepare("SELECT id FROM products WHERE external_id = ?");
                $stmt->execute([$productData['external_id']]);
                $existing = $stmt->fetch();
            }
            if ($existing) {
                $this->productModel->update($existing['id'], $productData);
                $updated++;
            } else {
                $this->productModel->create($productData);
                $created++;
            }
        }
        $this->sendSuccess(['created' => $created, 'updated' => $updated, 'skipped' => $skipped]);
    }
}