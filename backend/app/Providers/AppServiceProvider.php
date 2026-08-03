<?php

namespace App\Providers;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Validator::extend('allowed_extensions', function ($attribute, $value, $parameters, $validator) {
            if (! $value instanceof UploadedFile) {
                return false;
            }
            $extension = strtolower($value->getClientOriginalExtension());

            return in_array($extension, $parameters);
        }, 'Trường :attribute phải là tệp tin có định dạng: :values.');

        Validator::replacer('allowed_extensions', function ($message, $attribute, $rule, $parameters) {
            return str_replace(':values', implode(', ', $parameters), $message);
        });
    }
}
