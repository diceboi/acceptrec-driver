import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface FieldChange {
  before: string;
  after: string;
}

interface ClientEditNotificationEmailProps {
  driverName: string;
  clientName: string;
  weekStartDate: string;
  editReason: string;
  changes: Record<string, FieldChange>;
  approvedAfterEdit: boolean;
}

export const ClientEditNotificationEmail = ({
  driverName,
  clientName,
  weekStartDate,
  editReason,
  changes,
  approvedAfterEdit,
}: ClientEditNotificationEmailProps) => {
  const changeEntries = Object.entries(changes);

  const friendlyFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase());
  };

  return (
    <Html>
      <Head />
      <Preview>Client edited a timesheet – {driverName} – Week of {weekStartDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Timesheet Edited by Client</Heading>

          <Section style={infoSection}>
            <Text style={label}>Driver</Text>
            <Text style={value}>{driverName}</Text>

            <Text style={label}>Client</Text>
            <Text style={value}>{clientName}</Text>

            <Text style={label}>Week Starting</Text>
            <Text style={value}>{weekStartDate}</Text>

            <Text style={label}>Status after edit</Text>
            <Text style={{ ...value, color: approvedAfterEdit ? '#16a34a' : '#ca8a04', fontWeight: 600 }}>
              {approvedAfterEdit ? '✅ Approved' : '⏳ Still pending approval'}
            </Text>
          </Section>

          <Hr style={divider} />

          <Heading as="h2" style={h2}>Reason for edit</Heading>
          <Text style={reasonBox}>{editReason}</Text>

          {changeEntries.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Changes made</Heading>
              <Section style={tableWrapper}>
                <Row style={tableHeader}>
                  <Column style={col}>Field</Column>
                  <Column style={col}>Before</Column>
                  <Column style={col}>After</Column>
                </Row>
                {changeEntries.map(([field, { before, after }]) => (
                  <Row key={field} style={tableRow}>
                    <Column style={col}>{friendlyFieldName(field)}</Column>
                    <Column style={{ ...col, color: '#dc2626' }}>{before || '—'}</Column>
                    <Column style={{ ...col, color: '#16a34a' }}>{after || '—'}</Column>
                  </Row>
                ))}
              </Section>
            </>
          )}

          {changeEntries.length === 0 && (
            <Text style={noChanges}>No field values were changed (reason/approval only).</Text>
          )}

          <Hr style={divider} />
          <Text style={footer}>Accept Recruitment – Timesheet Management System</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ClientEditNotificationEmail;

// Styles
const main = { backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '32px', maxWidth: '600px', borderRadius: '8px' };
const h1 = { fontSize: '22px', color: '#111827', marginBottom: '16px' };
const h2 = { fontSize: '16px', color: '#374151', marginTop: '24px', marginBottom: '8px' };
const infoSection = { marginBottom: '8px' };
const label = { fontSize: '12px', color: '#6b7280', margin: '4px 0 0' };
const value = { fontSize: '15px', color: '#111827', margin: '0 0 8px' };
const reasonBox = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', fontSize: '14px', color: '#374151' };
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const tableWrapper = { width: '100%' };
const tableHeader = { backgroundColor: '#f3f4f6', fontWeight: 700, fontSize: '13px' };
const tableRow = { borderBottom: '1px solid #e5e7eb', fontSize: '13px' };
const col = { padding: '8px', fontSize: '13px' };
const noChanges = { color: '#6b7280', fontStyle: 'italic', fontSize: '14px' };
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, marginTop: '16px' };
