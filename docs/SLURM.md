# Slurm GPU environment guide

The Slurm cluster is intended for repeatable vision evaluation and optional
model experiments—not as the public LifeLens request server.

## Inspect the cluster

```bash
sinfo
scontrol show partition
squeue -u "$USER"
sacctmgr show qos format=Name,MaxWall,MaxTRESPU 2>/dev/null || true
```

Ask the administrator for the GPU partition, available accelerators, wall-time
limit, storage policy, and whether outbound model/API access is allowed.

## Interactive GPU check

Replace `<gpu-partition>` with the local partition name:

```bash
srun --partition=<gpu-partition> --gres=gpu:1 --time=00:20:00 --pty bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name())"
```

## Batch smoke test

The portable job file intentionally omits a partition so it can be provided by
the local environment:

```bash
sbatch --partition=<gpu-partition> slurm/gpu-smoke.sbatch
squeue -u "$USER"
tail -f lifelens-gpu-<job-id>.out
```

## Recommended experiment boundary

Use the cluster for food-detection evaluation, frame sampling experiments,
latency benchmarks, and offline vision models. Do not upload private wearable
video until the institution's data policy, consent procedure, retention window,
and approved storage location are documented.

Start with public or synthetic samples. Export only evaluation metrics and
approved model artifacts; never treat a shared HPC filesystem as private user
memory.
