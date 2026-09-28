<?php

declare(strict_types=1);

namespace MedQueue\Support;

final class Validator
{
    /** @return array{ok:bool, errors:array<string,string>} */
    public static function require(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            $parts = explode('|', $rule);

            foreach ($parts as $part) {
                if ($part === 'required' && ($value === null || trim((string) $value) === '')) {
                    $errors[$field] = 'This field is required.';
                }

                if ($part === 'email' && $value !== null && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = 'Invalid email format.';
                }

                if (str_starts_with($part, 'min:') && is_string($value)) {
                    $min = (int) substr($part, 4);
                    if (mb_strlen($value) < $min) {
                        $errors[$field] = "Minimum length is {$min}.";
                    }
                }
            }
        }

        return ['ok' => $errors === [], 'errors' => $errors];
    }
}
