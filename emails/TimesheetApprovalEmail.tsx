import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface TimesheetApprovalEmailProps {
  clientName: string;
  weekStartDate: string;
  approvalLink: string;
}

export const TimesheetApprovalEmail = ({
  clientName,
  weekStartDate,
  approvalLink,
}: TimesheetApprovalEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Timesheet Approval Required for {clientName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Timesheet Approval Request</Heading>
          <Text style={text}>Dear {clientName},</Text>
          <Text style={text}>
            You have new timesheets waiting for your approval for the week starting on {weekStartDate}.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={approvalLink}>
              Review Timesheets
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Link href={approvalLink} style={link}>
            {approvalLink}
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            Accept Recruitment Drivers Portal
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TimesheetApprovalEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  lineHeight: "1.25",
};

const text = {
  fontSize: "16px",
  margin: "24px 0",
  lineHeight: "1.5",
  color: "#525f7f",
};

const btnContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "12px",
};

const link = {
  color: "#0070f3",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#dfe1e4",
  margin: "42px 0 26px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};
