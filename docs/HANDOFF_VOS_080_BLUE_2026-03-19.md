# HANDOFF — VOS-080: Frontend Multimodal & Tool UI (Phase 3)
**Agent:** Mr. Blue  
**Date:** 2026-03-19  

## Objective
Upgrade the Vite Web and Expo Mobile Chat UIs to support multimodal attachments and dynamic Tool/Agent execution states.

## Required Changes
### 1. Attachment UI
- Add a designated paperclip / image upload icon button next to the primary Chat text input.
- Convert locally selected images into base64 thumbnails and display them beautifully above the chat input before sending.
- Update the payload sent through `apiService` to optionally map the `attachments` array.

### 2. Multi-Turn / Tool Execution UI States
- If the backend takes longer than normal while resolving a backend action (i.e. the system is executing step 2 of the Tool Loop), display a dynamic loader chip (e.g., *"Agent is executing an action..."* or *"Creating Task..."*).
- Maintain robust OLED-black compliance strictly matching Figma styling. 
- Ensure markdown rendering is completely robust for any structured tables or lists the new Instruct model naturally outputs.

## Verification
- Visually upload an image in the Web App interface, type a prompt like "Describe this diagram", and verify the Base64 cleanly reaches the FastAPI gateway.
- Ensure the UI seamlessly conveys that the agent is actually performing work in the background when executing actions.
