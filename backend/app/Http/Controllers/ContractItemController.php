<?php

namespace App\Http\Controllers;

use App\Models\ClientContract;
use App\Models\ContractItem;
use App\Models\ProjectPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContractItemController extends Controller
{
    /**
     * Danh sách hạng mục của hợp đồng
     */
    public function index($contractId): JsonResponse
    {
        $contract = ClientContract::find($contractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng khách hàng'], 404);
        }

        $items = ContractItem::where('contract_id', $contractId)->orderBy('id', 'asc')->get();

        return response()->json($items);
    }

    /**
     * Thêm mới hạng mục công việc
     */
    public function store(Request $request, $contractId): JsonResponse
    {
        $contract = ClientContract::find($contractId);

        if (! $contract) {
            return response()->json(['message' => 'Không tìm thấy hợp đồng khách hàng'], 404);
        }

        // Chỉ chặn khi hợp đồng đã hoàn thành hoặc dự án đã hoàn thành
        if ($contract->status === 'COMPLETED') {
            return response()->json([
                'message' => 'Hợp đồng đã hoàn thành, không thể thêm hạng mục mới.',
            ], 400);
        }

        if ($contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể thêm hạng mục hợp đồng mới.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'item_name' => 'required|string|max:191',
            'volume' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Tính toán hạn mức mới: Giá trị gốc + Tổng phụ lục Có hiệu lực
        $limit = floatval($contract->original_value) + floatval($contract->addendums()->where('status', 'Có hiệu lực')->sum('value_adjustment'));

        // Kiểm tra tổng giá trị các hạng mục active không vượt quá hạn mức
        $existingSum = ContractItem::where('contract_id', $contractId)->where('status', 'active')->get()->sum('price');
        $requestedPrice = floatval($request->unit_price);
        if ($existingSum + $requestedPrice > $limit) {
            return response()->json([
                'message' => 'Tổng giá trị các hạng mục ('.number_format($existingSum + $requestedPrice).' VNĐ) không được vượt quá hạn mức hợp đồng ('.number_format($limit).' VNĐ).',
            ], 400);
        }

        $item = new ContractItem;
        $item->contract_id = $contractId;
        $item->item_name = $request->item_name;
        $item->volume = $request->volume;
        $item->unit_price = $request->unit_price;
        $item->status = 'active';
        $item->save();

        return response()->json([
            'message' => 'Thêm hạng mục công việc thành công',
            'data' => $item,
        ], 201);
    }

    /**
     * Cập nhật hạng mục công việc
     */
    public function update(Request $request, $id): JsonResponse
    {
        $item = ContractItem::find($id);

        if (! $item) {
            return response()->json(['message' => 'Không tìm thấy hạng mục công việc'], 404);
        }

        $contract = ClientContract::find($item->contract_id);

        // Chỉ chặn khi hợp đồng đã hoàn thành hoặc dự án đã hoàn thành
        if ($contract && $contract->status === 'COMPLETED') {
            return response()->json([
                'message' => 'Hợp đồng liên kết đã hoàn thành, không thể cập nhật hạng mục.',
            ], 400);
        }

        if ($contract && $contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể chỉnh sửa hạng mục hợp đồng.'], 400);
        }

        $validator = Validator::make($request->all(), [
            'item_name' => 'required|string|max:191',
            'volume' => 'required|numeric|min:0',
            'unit_price' => 'required|numeric|min:0',
            'status' => 'nullable|string|in:active,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        // Tính toán hạn mức mới: Giá trị gốc + Tổng phụ lục Có hiệu lực
        if ($contract) {
            $limit = floatval($contract->original_value) + floatval($contract->addendums()->where('status', 'Có hiệu lực')->sum('value_adjustment'));
            $existingSum = ContractItem::where('contract_id', $item->contract_id)
                ->where('id', '!=', $id)
                ->where('status', 'active')
                ->get()
                ->sum('price');

            $newStatus = $request->input('status', $item->status);
            $requestedPrice = 0;
            if ($newStatus === 'active') {
                $requestedPrice = floatval($request->unit_price);
            }

            if ($existingSum + $requestedPrice > $limit) {
                return response()->json([
                    'message' => 'Tổng giá trị các hạng mục ('.number_format($existingSum + $requestedPrice).' VNĐ) không được vượt quá hạn mức hợp đồng ('.number_format($limit).' VNĐ).',
                ], 400);
            }
        }

        $oldStatus = $item->status;
        $item->item_name = $request->item_name;
        $item->volume = $request->volume;
        $item->unit_price = $request->unit_price;
        if ($request->has('status')) {
            $item->status = $request->input('status');
        }
        $item->save();

        return response()->json([
            'message' => 'Cập nhật hạng mục công việc thành công',
            'data' => $item,
        ]);
    }

    /**
     * Xóa hạng mục công việc
     */
    public function destroy($id): JsonResponse
    {
        $item = ContractItem::find($id);

        if (! $item) {
            return response()->json(['message' => 'Không tìm thấy hạng mục công việc'], 404);
        }

        $contract = ClientContract::find($item->contract_id);

        // Kiểm tra hợp đồng đã phát sinh thanh toán/thu tiền thực tế chưa
        $hasPayment = ProjectPayment::where('client_contract_id', $item->contract_id)
            ->where('payment_type', 'THU')
            ->exists();

        if ($hasPayment) {
            return response()->json([
                'message' => 'Hợp đồng liên kết đã phát sinh thanh toán/thu tiền từ khách hàng, không thể xóa hạng mục.',
            ], 400);
        }

        // Kiểm tra hợp đồng đang hiệu lực/hoàn thành
        if ($contract && ($contract->status === 'ACTIVE' || $contract->status === 'COMPLETED')) {
            return response()->json([
                'message' => 'Hợp đồng đang có hiệu lực hoặc đã hoàn thành, không thể xóa hạng mục. Vui lòng chuyển trạng thái hợp đồng về Bản nháp để chỉnh sửa.',
            ], 400);
        }

        if ($contract && $contract->project && $contract->project->getRawOriginal('status') === 'Đã hoàn thành') {
            return response()->json(['message' => 'Dự án đã hoàn thành, không thể xóa hạng mục hợp đồng.'], 400);
        }

        $item->delete();

        return response()->json(['message' => 'Xóa hạng mục công việc thành công']);
    }
}
