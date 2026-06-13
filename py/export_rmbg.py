import sys
import os
import importlib.util
import torch
import torch.nn as nn

sys.path.insert(0, r'D:\ComfyUI-aki-v2\ComfyUI\custom_nodes\ComfyUI-Easy-Use')
spec = importlib.util.spec_from_file_location('rembg', r'D:\ComfyUI-aki-v2\ComfyUI\custom_nodes\ComfyUI-Easy-Use\py\modules\briaai\rembg.py')
rembg = importlib.util.module_from_spec(spec)
sys.modules['rembg'] = rembg
spec.loader.exec_module(rembg)
BriaRMBG = rembg.BriaRMBG

model_path = r'D:\ComfyUI-aki-v2\ComfyUI\models\rembg\RMBG-1.4.pth'
output_path = r'E:\Git_RoXami\RoxamiStudio\wwwroot\lib\bg-removal\rmbg14.onnx'

device = torch.device('cpu')
net = BriaRMBG()
state = torch.load(model_path, map_location=device, weights_only=True)
net.load_state_dict(state)
net.to(device)
net.eval()

class RMBGWrapper(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    def forward(self, x):
        results, _ = self.model(x)
        return results[0]

wrapper = RMBGWrapper(net)
dummy = torch.randn(1, 3, 1024, 1024, device=device)

with torch.no_grad():
    test_out = wrapper(dummy)
    print(f'Test output shape: {test_out.shape}')

torch.onnx.export(
    wrapper, dummy, output_path,
    input_names=['input'], output_names=['alpha'],
    opset_version=17,
    dynamic_axes={'input': {0: 'batch'}, 'alpha': {0: 'batch'}}
)

print(f'Exported to: {output_path}')
import onnx
model = onnx.load(output_path)
onnx.checker.check_model(model)
size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f'Model size: {size_mb:.1f} MB, validated OK')
