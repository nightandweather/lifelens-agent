#!/usr/bin/env bash
#SBATCH --job-name=lifelens-gpu
#SBATCH --gres=gpu:1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --time=00:10:00
#SBATCH --output=lifelens-gpu-%j.out

set -euo pipefail

echo "LifeLens Slurm GPU smoke test"
echo "host=$(hostname) job=${SLURM_JOB_ID:-local}"
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv

python - <<'PY'
try:
    import torch
except ImportError:
    print("PyTorch is not loaded; GPU hardware check completed with nvidia-smi.")
else:
    print(f"torch={torch.__version__}")
    print(f"cuda_available={torch.cuda.is_available()}")
    if torch.cuda.is_available():
        device = torch.device("cuda")
        value = (torch.ones((1024, 1024), device=device) @ torch.ones((1024, 8), device=device)).sum()
        print(f"device={torch.cuda.get_device_name(0)} result={value.item():.0f}")
PY
