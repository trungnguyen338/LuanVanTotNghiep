<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\Subcontractor;
use App\Models\TaskDetail;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Lấy thống kê tổng quan cho Dashboard
     */
    public function getStats(): JsonResponse
    {
        // 1. Thống kê dự án
        $totalProjects = Project::count();
        $activeProjects = Project::where('status', 'Đang triển khai')->count();

        // 1b. Thống kê khách hàng và nhà thầu phụ
        $totalCustomers = Customer::where('status', 1)->count();
        $totalSubcontractors = Subcontractor::where('status', 1)->count();

        // 2. Doanh thu (Tổng thực thu)
        $totalRevenue = floatval(ProjectPayment::where('payment_type', 'THU')->where('status', 'Đã giải ngân')->sum('amount'));

        // 3. Chi phí (Tổng thực chi)
        $totalCosts = floatval(ProjectPayment::where('payment_type', 'CHI')->where('status', 'Đã giải ngân')->sum('amount'));

        // 4. Tiến độ 10 dự án gần nhất
        $recentProjects = Project::with(['category', 'customer.user', 'tasks.details'])
            ->orderBy('id', 'desc')
            ->limit(10)
            ->get();

        $recentProjectsFormatted = $recentProjects->map(function ($project) {
            $tasks = $project->tasks;
            $progress = 0;
            if ($tasks->isNotEmpty()) {
                $totalValue = 0;
                $weightedProgressSum = 0;
                foreach ($tasks as $task) {
                $value = 0;
                $value = floatval($task->billing_value);
                $totalValue += $value;
                $weightedProgressSum += floatval($task->progress_percent) * $value;
            }
                if ($totalValue > 0) {
                    $progress = round($weightedProgressSum / $totalValue);
                } else {
                    $progress = round($tasks->avg('progress_percent'));
                }
            }

            return [
                'id' => $project->id,
                'name' => $project->name,
                'category' => $project->category ? $project->category->name : 'N/A',
                'customer' => $project->customer && $project->customer->user ? $project->customer->user->full_name : 'N/A',
                'progress' => min(100, max(0, (int) $progress)),
            ];
        });

        // 5. Biểu đồ Doanh thu & Chi phí 6 tháng gần nhất
        $monthlyData = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $year = $date->year;
            $month = $date->month;
            $monthLabel = 'T'.$month;

            $revenue = floatval(ProjectPayment::where('payment_type', 'THU')
                ->where('status', 'Đã giải ngân')
                ->whereYear('payment_date', $year)
                ->whereMonth('payment_date', $month)
                ->sum('amount'));

            $cost = floatval(ProjectPayment::where('payment_type', 'CHI')
                ->where('status', 'Đã giải ngân')
                ->whereYear('payment_date', $year)
                ->whereMonth('payment_date', $month)
                ->sum('amount'));

            $monthlyData[] = [
                'name' => $monthLabel,
                'Doanh thu' => round($revenue / 1000000000, 1),
                'Chi phí' => round($cost / 1000000000, 1),
            ];
        }

        $upcomingTasks = TaskDetail::with(['task.project'])
            ->where('progress_percent', '<', 100)
            ->where('progress_percent', '>=', 0)
            ->whereNotNull('end_date')
            ->orderBy('end_date', 'asc')
            ->limit(10)
            ->get();

        $upcomingTasksFormatted = $upcomingTasks->map(function ($detail) {
            $endDate = $detail->end_date;
            $today = Carbon::now()->startOfDay();
            $detailDate = Carbon::parse($endDate)->startOfDay();
            $diffDays = $today->diffInDays($detailDate, false);

            $deadlineText = '';
            $status = 'normal';

            if ($diffDays < 0) {
                $deadlineText = 'Quá hạn '.abs($diffDays).' ngày';
                $status = 'overdue';
            } elseif ($diffDays === 0) {
                $deadlineText = 'Hôm nay';
                $status = 'urgent';
            } elseif ($diffDays === 1) {
                $deadlineText = 'Ngày mai';
                $status = 'warning';
            } else {
                $deadlineText = $detailDate->format('d/m/Y');
                $status = 'normal';
            }

            return [
                'key' => strval($detail->id),
                'taskName' => $detail->detail_name,
                'project' => $detail->task && $detail->task->project ? $detail->task->project->name : 'N/A',
                'deadline' => $deadlineText,
                'status' => $status,
            ];
        });

        return response()->json([
            'total_projects' => $totalProjects,
            'active_projects' => $activeProjects,
            'total_customers' => $totalCustomers,
            'total_subcontractors' => $totalSubcontractors,
            'total_revenue' => $totalRevenue,
            'total_costs' => $totalCosts,
            'recent_projects' => $recentProjectsFormatted,
            'monthly_data' => $monthlyData,
            'upcoming_tasks' => $upcomingTasksFormatted,
        ]);
    }
}
