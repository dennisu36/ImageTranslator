namespace ImageTranslateTest
{
    partial class Form1
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.ocrTextbox = new System.Windows.Forms.TextBox();
            this.button1 = new System.Windows.Forms.Button();
            this.originalTextbox = new System.Windows.Forms.TextBox();
            this.originalLabel = new System.Windows.Forms.Label();
            this.ocrOutputLabel = new System.Windows.Forms.Label();
            this.SuspendLayout();
            // 
            // ocrTextbox
            // 
            this.ocrTextbox.Location = new System.Drawing.Point(87, 168);
            this.ocrTextbox.Name = "ocrTextbox";
            this.ocrTextbox.Size = new System.Drawing.Size(373, 26);
            this.ocrTextbox.TabIndex = 0;
            // 
            // button1
            // 
            this.button1.Location = new System.Drawing.Point(188, 226);
            this.button1.Name = "button1";
            this.button1.Size = new System.Drawing.Size(173, 29);
            this.button1.TabIndex = 1;
            this.button1.Text = "Find Accuracy";
            this.button1.UseVisualStyleBackColor = true;
            this.button1.Click += new System.EventHandler(this.button1_Click);
            // 
            // originalTextbox
            // 
            this.originalTextbox.Location = new System.Drawing.Point(87, 90);
            this.originalTextbox.Name = "originalTextbox";
            this.originalTextbox.Size = new System.Drawing.Size(373, 26);
            this.originalTextbox.TabIndex = 2;
            // 
            // originalLabel
            // 
            this.originalLabel.AutoSize = true;
            this.originalLabel.Location = new System.Drawing.Point(85, 59);
            this.originalLabel.Name = "originalLabel";
            this.originalLabel.Size = new System.Drawing.Size(100, 20);
            this.originalLabel.TabIndex = 3;
            this.originalLabel.Text = "Original Text:";
            // 
            // ocrOutputLabel
            // 
            this.ocrOutputLabel.AutoSize = true;
            this.ocrOutputLabel.Location = new System.Drawing.Point(85, 145);
            this.ocrOutputLabel.Name = "ocrOutputLabel";
            this.ocrOutputLabel.Size = new System.Drawing.Size(135, 20);
            this.ocrOutputLabel.TabIndex = 4;
            this.ocrOutputLabel.Text = "OCR Output Text:";
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(9F, 20F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(581, 440);
            this.Controls.Add(this.ocrOutputLabel);
            this.Controls.Add(this.originalLabel);
            this.Controls.Add(this.originalTextbox);
            this.Controls.Add(this.button1);
            this.Controls.Add(this.ocrTextbox);
            this.Name = "Form1";
            this.Text = "Form1";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.TextBox ocrTextbox;
        private System.Windows.Forms.Button button1;
        private System.Windows.Forms.TextBox originalTextbox;
        private System.Windows.Forms.Label originalLabel;
        private System.Windows.Forms.Label ocrOutputLabel;
    }
}

