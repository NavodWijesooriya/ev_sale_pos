# Replace purple classes with theme primary colors
$patterns = @(
    @{ Find = 'bg-purple-600'; Replace = 'bg-primary' },
    @{ Find = 'bg-purple-500/10'; Replace = 'bg-primary/10' },
    @{ Find = 'bg-purple-500/20'; Replace = 'bg-primary/20' },
    @{ Find = 'bg-purple-500/5'; Replace = 'bg-primary/5' },
    @{ Find = 'bg-purple-500/15'; Replace = 'bg-primary/15' },
    @{ Find = 'bg-purple-500/30'; Replace = 'bg-primary/30' },
    @{ Find = 'text-purple-600'; Replace = 'text-primary-foreground' },
    @{ Find = 'text-purple-500'; Replace = 'text-primary-foreground' },
    @{ Find = 'border-purple-500/30'; Replace = 'border-primary/30' },
    @{ Find = 'border-purple-500/20'; Replace = 'border-primary/20' },
    @{ Find = 'border-purple-500/10'; Replace = 'border-primary/10' },
    @{ Find = 'shadow-purple-500/20'; Replace = 'shadow-primary/20' },
    @{ Find = 'bg-gradient-to-tr from-purple-600 to-indigo-600'; Replace = 'bg-primary' },
    @{ Find = 'bg-gradient-to-r from-purple-600 to-indigo-600'; Replace = 'bg-primary' }
)

Get-ChildItem -Path . -Recurse -Include *.tsx,*.ts,*.jsx,*.js -Exclude node_modules,.next | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    $original = $content
    foreach ($p in $patterns) {
        $content = $content -replace [regex]::Escape($p.Find), $p.Replace
    }
    if ($content -ne $original) {
        Set-Content -Path $file -Value $content -Encoding utf8
        Write-Host "Updated $file"
    }
}
