import { Modal, Text, Group, Button } from '@mantine/core';

interface Props {
  opened: boolean;
  entityName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({ opened, entityName, onConfirm, onClose }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Confirm deletion" size="sm">
      <Text mb="lg">
        Are you sure you want to delete <strong>{entityName}</strong>? This action cannot be undone.
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button color="red" onClick={() => { onConfirm(); onClose(); }}>Delete</Button>
      </Group>
    </Modal>
  );
}
