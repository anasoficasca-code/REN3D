@echo off
cd /d C:\Users\ACER\Documents\Default Project
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=amd64 >nul
set "CUDA_HOME=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6"
set "PATH=%PATH%;C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin"
set TORCH_CUDA_ARCH_LIST=8.9
set FAST_COMPILE=1
"C:\Users\ACER\Documents\Default Project\REN3D\splatwork\venv312\Scripts\python.exe" -c "from gsplat.cuda._backend import _C; assert _C is not None; print(12345)"
if %ERRORLEVEL% neq 0 (
  echo COMPILACION FALLO, no se entrena
  exit /b 1
)
"C:\Users\ACER\Documents\Default Project\REN3D\splatwork\venv312\Scripts\python.exe" REN3D\splatwork\train_splat.py REN3D\splatwork\sparse\2
